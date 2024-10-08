import {observable} from 'mobx';
import {observer} from 'mobx-react';
import React, {Component} from 'react';
import SliderAxis, {AxisProps, SliderProps} from './SliderAxis';

type ContentWidth = number;
type ContentHeight = number;

interface Graph {
  content?: {
    size?: [ContentWidth, ContentHeight];
  };
}

interface LineProps extends AxisProps, SliderProps {
  graph?: Graph;
}

@observer
class ThickSlider extends Component<LineProps> {
  @observable positionX: number = 0; // 滑动的 x 轴距离
  _ref: SliderAxis | null = null;

  render() {
    return <SliderAxis ref={ref => (this._ref = ref)} {...this.props} />;
  }
}

export default ThickSlider;
