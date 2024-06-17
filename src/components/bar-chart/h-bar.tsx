import { Bar } from '@ant-design/plots';

interface BarChartProps {
  data: any[];
  xField: string;
  yField: string;
  title?: string;
  height?: number;
}
const BarChart: React.FC<BarChartProps> = (props) => {
  const { data, xField, yField, title, height = 300 } = props;
  const config = {
    data,
    xField,
    yField,
    title,
    // colorField: 'name',
    direction: 'vertical',
    height,
    group: true,
    legend: {
      color: {
        position: 'top',
        layout: {
          justifyContent: 'center'
        }
      }
    },
    axis: {
      x: {
        xAxis: true
      }
    },

    split: {
      type: 'line',
      line: {
        color: 'red',
        style: {
          color: 'red',
          lineDash: [4, 5]
        }
      }
    },

    style: {
      fill: '#2fbf85',
      radiusTopLeft: 8,
      radiusTopRight: 8,
      height: 30
    }
  };

  return (
    <>
      <Bar {...config} />
    </>
  );
};

export default BarChart;
