import React from 'react';
import {View, SectionList, Button, Text, StyleSheet} from 'react-native';
import {observer} from 'mobx-react';
import {observable, action} from 'mobx';

// 数据生成函数
const generateData = count => {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      title: `Section ${i}`,
      data: Array.from({length: 10}, (_, j) => `Item ${i}-${j}`),
    });
  }
  return data;
};

// 使用 MobX 的 SectionList 组件
class MobxStore {
  @observable data = generateData(20);

  constructor() {
    this.addData = action(this.addData.bind(this));
  }

  addData() {
    this.data.push({
      title: `Section ${this.data.length}`,
      data: Array.from({length: 10}, (_, j) => `Item ${this.data.length}-${j}`),
    });
  }
}

const store = new MobxStore();

@observer
class MobxSectionList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      renderTime: 0,
    };
  }

  componentDidUpdate() {
    const start = Date.now();
    this.setState({renderTime: Date.now() - start});
  }

  render() {
    return (
      <View style={styles.container}>
        <Button title="Add Section (MobX)" onPress={() => store.addData()} />
        <SectionList
          sections={store.data.slice()} // 将 MobX observable 转为普通数组
          keyExtractor={(item, index) => item + index}
          renderItem={({item}) => <Text style={styles.item}>{item}</Text>}
          renderSectionHeader={({section: {title}}) => (
            <Text style={styles.header}>{title}</Text>
          )}
        />
        <Text>Render Time: {this.state.renderTime} ms</Text>
      </View>
    );
  }
}

// 使用 React state 的 SectionList 组件
const StateSectionList = () => {
  const [data, setData] = React.useState(generateData(20));
  const [renderTime, setRenderTime] = React.useState(0);

  const addData = () => {
    setData(prevData => [
      ...prevData,
      {
        title: `Section ${prevData.length}`,
        data: Array.from(
          {length: 10},
          (_, j) => `Item ${prevData.length}-${j}`,
        ),
      },
    ]);
  };

  React.useEffect(() => {
    const start = Date.now();
    return () => {
      const end = Date.now();
      setRenderTime(end - start);
    };
  }, [data]);

  return (
    <View style={styles.container}>
      <Button title="Add Section (State)" onPress={addData} />
      <SectionList
        sections={data}
        keyExtractor={(item, index) => item + index}
        renderItem={({item}) => <Text style={styles.item}>{item}</Text>}
        renderSectionHeader={({section: {title}}) => (
          <Text style={styles.header}>{title}</Text>
        )}
      />
      <Text>Render Time: {renderTime} ms</Text>
    </View>
  );
};

// 测试组件
const PerformanceTest = () => {
  return (
    <View style={styles.mainContainer}>
      <Text style={styles.title}>MobX SectionList</Text>
      <MobxSectionList />
      <Text style={styles.title}>State SectionList</Text>
      <StateSectionList />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    paddingTop: 50,
  },
  container: {
    flex: 1,
    padding: 10,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    marginVertical: 20,
  },
  header: {
    fontSize: 18,
    backgroundColor: '#f4f4f4',
    padding: 5,
  },
  item: {
    padding: 10,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default PerformanceTest;
