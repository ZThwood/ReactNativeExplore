import React, {Component, ReactNode} from 'react';
import {
  Animated,
  ImageSourcePropType,
  InteractionManager,
  LayoutChangeEvent,
  PanResponder,
  View,
} from 'react-native';
import ColorPickerSVG from './rgb_color_picker.svg';
import colorsys from 'colorsys';
import {observable} from 'mobx';

type ColorPalletProps = {
  circleVisible?: boolean; // 是否显示焦点，默认为 true
  timeInterval: number;
  defaultShowPalletCircle?: boolean;
  defaultColor: {r: number; g: number; b: number};
  onChangeColor: (r: number, g: number, b: number, isLast: boolean) => void;
  imgPickerComp?: ReactNode;
  palletSize?: {width: number; height: number};
  circleSize?: {width: number; height: number};
  circleSource?: ImageSourcePropType;
  hideCircle?: boolean;
  useYAxisHue?: boolean; // 是否使用 Y 轴计算色相
};

type ColorPalletState = {
  palletCirclePos: {x: number; y: number};
  showPallet: boolean; // 是否显示色盘焦点
};

export const HSize = 360;
export const SVSize = 100;

const TAG = '[ColorPallet ]';

export default class ColorPallet extends Component<
  ColorPalletProps,
  ColorPalletState
> {
  static defaultProps = {
    circleVisible: true,
  };

  // 由于构造的时候未获取到组件宽高，因此需要有延迟加载defaultColor,但是onLayout里面是一直校准的方式，因此需要一个标志位来判断是否已经修改了颜色，不能使用defaultColor了
  _initedDefaultColor = false;

  // 用来校准调色盘位置的定时器
  _adjustingLayout: NodeJS.Timeout | null = null;

  // 用来处理时间间隔的变量
  _intervalCache = new Date().getTime();

  // 容器的node
  _contain: any;
  // 记录选择器的宽高位置
  _pickerFrame: {x: number; y: number; width: number; height: number} = {
    x: -1,
    y: -1,
    width: -1,
    height: -1,
  };
  // @observable
  // _palletCirclePos: {x: number; y: number} = {x: 0, y: 0};
  @observable defaultShowPalletCircle: boolean = true;

  _panResponse = PanResponder.create({
    // 要求成为响应者：
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: evt => {
      // 开始手势操作。给用户一些视觉反馈，让他们知道发生了什么事情！
      // gestureState.{x,y} 现在会被设置为0
      this._onChangeColor(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      this._updateCircle(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      !this.defaultShowPalletCircle && (this.defaultShowPalletCircle = true);
    },
    onPanResponderMove: evt => {
      // 最近一次的移动距离为gestureState.move{X,Y}
      // 从成为响应者开始时的累计手势移动距离为gestureState.d{x,y}
      this._onChangeColor(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      this._updateCircle(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderRelease: evt => {
      // 用户放开了所有的触摸点，且此时视图已经成为了响应者。
      // 一般来说这意味着一个手势操作已经成功完成。
      console.log(TAG, 'trige the last ');
      const {timeInterval} = this.props;
      const pageX = evt.nativeEvent.pageX;
      const pageY = evt.nativeEvent.pageY;
      setTimeout(() => {
        console.log(TAG, 'trige the last timeout');

        this._onChangeColor(pageX, pageY, true);
      }, timeInterval);
      this._updateCircle(pageX, pageY);
    },
    onPanResponderTerminate: () => {
      // 另一个组件已经成为了新的响应者，所以当前手势将被取消。
    },
    onShouldBlockNativeResponder: () => {
      // 返回一个布尔值，决定当前组件是否应该阻止原生组件成为JS响应者
      // 默认返回true。目前暂时只支持android。
      return true;
    },
  });

  constructor(props: ColorPalletProps) {
    super(props);
    this.state = {
      palletCirclePos: {x: 0, y: 0},
      showPallet: false,
    };
    this.defaultShowPalletCircle = props.defaultShowPalletCircle ?? true;
  }

  componentWillUnmount = () => {
    if (this._adjustingLayout) {
      clearInterval(this._adjustingLayout);
      this._adjustingLayout = null;
    }
  };

  getMaxLeftAndTop = () => {
    const {circleSize} = this.props;
    const maxLeft = this._pickerFrame.width - (circleSize?.width ?? 30);
    const maxTop = this._pickerFrame.height - (circleSize?.width ?? 30);
    return {maxLeft, maxTop};
  };

  getHSizeAndSVSize = () => {
    const {palletSize} = this.props;
    const hSize = HSize; // 色相
    const svSize = SVSize; // 饱和度
    return {hSize, svSize};
  };

  setRGB = (r: number, g: number, b: number) => {
    const position = this._rgb2Position(r, g, b);
    console.log('dsafdasfasf:', r, g, b);
    // 必须要分开设置，否则把observable的值给覆盖了
    this.setState({
      palletCirclePos: {
        x: position.x,
        y: position.y,
      },
    });
    // this._palletCirclePos.x = position.x;
    // this._palletCirclePos.y = position.y;
  };

  // 获取当前需要显示图标的坐标
  _getPosition = (pageX: number, pageY: number) => {
    const locationX = pageX - this._pickerFrame.x;
    const locationY = pageY - this._pickerFrame.y;
    console.log(
      TAG,
      '_onChangeColor pageY',
      pageY,
      ' this._pickerFrame.y ',
      this._pickerFrame.y,
      ' locationY ',
      locationY,
    );
    const {maxLeft, maxTop} = this.getMaxLeftAndTop();
    console.log(TAG, '_onChangeColor maxLeft, maxTop', maxLeft, maxTop);
    const realLocationX =
      locationX < 0 ? 0 : locationX > maxLeft ? maxLeft : locationX;
    const realLocationY =
      locationY < 0 ? 0 : locationY > maxTop ? maxTop : locationY;
    return {x: realLocationX, y: realLocationY};
  };

  // 根据坐标计算需要返回的颜色
  _onChangeColor = (pageX: number, pageY: number, isLast = false) => {
    console.log(TAG, '改变颜色_onChangeColor', pageX, pageY);

    const {onChangeColor, timeInterval, useYAxisHue} = this.props;
    const now = new Date().getTime();
    if (now - this._intervalCache < timeInterval) {
      return;
    }
    this._intervalCache = now;
    const realPosition = this._getPosition(pageX, pageY);

    const {maxLeft: XSize, maxTop: YSize} = this.getMaxLeftAndTop();
    const {hSize, svSize} = this.getHSizeAndSVSize();

    console.log(
      TAG,
      '改变颜色realPosition',
      realPosition,
      Math.abs(realPosition.y - YSize),
    );
    const hueOffset = useYAxisHue
      ? Math.abs(realPosition.y - YSize) / YSize
      : realPosition.x / XSize;
    const saturabilityOffset = useYAxisHue
      ? realPosition.x / XSize
      : realPosition.y / YSize;

    const h = hueOffset * hSize; // 色相
    const s = saturabilityOffset * svSize; // 饱和度

    console.log(TAG, '改变颜色realPosition hs', h, s);
    const {r, g, b} = colorsys.hsv2Rgb(h, s, svSize);
    console.log(TAG, '_onChangeColor r,g,b', r, g, b, {
      XSize,
      YSize,
      hSize,
      svSize,
    });
    onChangeColor && onChangeColor(r, g, b, !!isLast);
  };

  _rgb2Position = (r: number, g: number, b: number) => {
    const {h, s} = colorsys.rgb2Hsv(r, g, b);
    return this._getRealPosition(h, s);
  };

  _getRealPosition = (h: number, s: number) => {
    const {hSize, svSize} = this.getHSizeAndSVSize();
    const {maxLeft: XSize, maxTop: YSize} = this.getMaxLeftAndTop();

    const {useYAxisHue} = this.props;
    const hueOffset = h / hSize;
    const saturabilityOffset = s / svSize;

    let x = hueOffset * XSize;
    let y = saturabilityOffset * YSize;

    if (useYAxisHue) {
      x = saturabilityOffset * XSize;
      y = -(hueOffset * YSize) + YSize;
    }
    console.log(TAG, '_getRealPosition', YSize, {x, y});

    return {x, y};
  };
  _updateCircle = (pageX: number, pageY: number) => {
    console.log('_updateCircle:', pageX, pageY);
    const realPosition = this._getPosition(pageX, pageY);
    this.setState({
      palletCirclePos: {
        x: realPosition.x,
        y: realPosition.y,
      },
    });
    // this._palletCirclePos.x = realPosition.x;
    // this._palletCirclePos.y = realPosition.y;
    this._initedDefaultColor = true;
  };

  _onColorPickerLayout = ({nativeEvent}: LayoutChangeEvent) => {
    console.log(TAG, '_onColorPickerLayout nativeEvent:', nativeEvent);
    const updateFunc = (
      x: number,
      y: number,
      width: number,
      height: number,
    ) => {
      if (
        x === this._pickerFrame.x &&
        y === this._pickerFrame.y &&
        width === this._pickerFrame.width &&
        height === this._pickerFrame.height
      ) {
        return;
      }
      this._pickerFrame = {x, y, width, height};
      this._initDefaultColor();
      console.log(TAG, 'this._pickerFrame init', this._pickerFrame);
    };
    InteractionManager.runAfterInteractions(() => {
      // 先获取一下位置
      this._contain &&
        this._contain.measureInWindow(
          (x: number, y: number, width: number, height: number) => {
            updateFunc(x, y, width - 30, height);
          },
        );

      // 每一秒钟定时获取校准
      this._adjustingLayout = setInterval(() => {
        this._contain &&
          this._contain.measureInWindow(
            (x: number, y: number, width: number, height: number) => {
              updateFunc(x, y, width - 30, height);
            },
          );
      }, 1000);
    });
  };

  _initDefaultColor = () => {
    if (this._initedDefaultColor) {
      return;
    }
    const {defaultColor} = this.props;
    const defaultPosition = this._rgb2Position(
      defaultColor.r,
      defaultColor.g,
      defaultColor.b,
    );
    this.setState({
      palletCirclePos: {
        x: defaultPosition.x,
        y: defaultPosition.y,
      },
      showPallet: true,
    });
    // this._palletCirclePos.x = defaultPosition.x;
    // this._palletCirclePos.y = defaultPosition.y;
  };

  render(): ReactNode {
    const {palletCirclePos} = this.state;
    const {imgPickerComp, circleVisible, palletSize, circleSize, circleSource} =
      this.props;
    // TODO 像 CCTPallet 一样去掉定时更新布局位置宽高的逻辑，暂时先加个 circleVisible prop 在外面控制不显示焦点圆圈
    // const showCircle = palletCirclePos.x >= 0 && palletCirclePos.y >= 0;

    console.log(TAG, 'render', palletSize);

    return (
      <View
        ref={ref => (this._contain = ref)}
        style={{opacity: 1}}
        {...this._panResponse.panHandlers}
        onLayout={this._onColorPickerLayout}>
        {imgPickerComp ?? (
          <ColorPickerSVG
            width={palletSize?.width ?? 448}
            height={palletSize?.height ?? 180}
          />
        )}
        {circleVisible &&
        this.state.showPallet &&
        this.defaultShowPalletCircle ? (
          <Animated.Image
            source={circleSource ?? require('./pallet_circle.png')}
            style={[
              {
                width: circleSize?.width ?? 30,
                height: circleSize?.height ?? 30,
                // backgroundColor: 'black',
                position: 'absolute',
                top: palletCirclePos.y,
                left: palletCirclePos.x,
              },
            ]}
          />
        ) : null}
      </View>
    );
  }
}
