import { ApexOptions } from "apexcharts";
import { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { type DailyStatsProps } from "../../../analytics/stats";

const options: ApexOptions = {
  legend: {
    show: false,
    position: "top",
    horizontalAlign: "left",
  },
  colors: ["#3C50E0", "#80CAEE"],
  chart: {
    fontFamily: "system-ui, sans-serif",
    height: 335,
    type: "area",
    dropShadow: {
      enabled: true,
      color: "#623CEA14",
      top: 10,
      blur: 4,
      left: 0,
      opacity: 0.1,
    },

    toolbar: {
      show: false,
    },
  },
  responsive: [
    {
      breakpoint: 1024,
      options: {
        chart: {
          height: 300,
        },
      },
    },
    {
      breakpoint: 1366,
      options: {
        chart: {
          height: 350,
        },
      },
    },
  ],
  stroke: {
    width: [2, 2],
    curve: "straight",
  },
  // labels: {
  //   show: false,
  //   position: "top",
  // },
  grid: {
    xaxis: {
      lines: {
        show: true,
      },
    },
    yaxis: {
      lines: {
        show: true,
      },
    },
  },
  dataLabels: {
    enabled: false,
  },
  markers: {
    size: 4,
    colors: "#fff",
    strokeColors: ["#3056D3", "#80CAEE"],
    strokeWidth: 3,
    strokeOpacity: 0.9,
    strokeDashArray: 0,
    fillOpacity: 1,
    discrete: [],
    hover: {
      size: undefined,
      sizeOffset: 5,
    },
  },
  xaxis: {
    type: "category",
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
  },
  yaxis: {
    title: {
      style: {
        fontSize: "0px",
      },
    },
    min: 0,
    max: 100,
  },
};

interface ChartOneState {
  series: {
    name: string;
    data: number[];
  }[];
}

const RevenueAndProfitChart = ({ weeklyStats, isLoading }: DailyStatsProps) => {
  const dailyRevenueArray = useMemo(() => {
    if (!!weeklyStats && weeklyStats?.length > 0) {
      const sortedWeeks = weeklyStats?.sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      return sortedWeeks.map((stat) => stat.totalRevenue);
    }
  }, [weeklyStats]);

  const daysOfWeekArr = useMemo(() => {
    if (!!weeklyStats && weeklyStats?.length > 0) {
      const datesArr = weeklyStats?.map((stat) => {
        // get day of week, month, and day of month
        const dateArr = stat.date.toString().split(" ");
        return dateArr.slice(0, 3).join(" ");
      });
      return datesArr;
    }
  }, [weeklyStats]);

  const [state, setState] = useState<ChartOneState>({
    series: [
      {
        name: "Profit",
        data: [4, 7, 10, 11, 13, 14, 17],
      },
    ],
  });
  const [chartOptions, setChartOptions] = useState<ApexOptions>(options);

  useEffect(() => {
    if (dailyRevenueArray && dailyRevenueArray.length > 0) {
      setState((prevState) => {
        // Check if a "Revenue" series already exists
        const existingSeriesIndex = prevState.series.findIndex(
          (series) => series.name === "Revenue",
        );

        if (existingSeriesIndex >= 0) {
          // Update existing "Revenue" series data
          return {
            ...prevState,
            series: prevState.series.map((serie, index) => {
              if (index === existingSeriesIndex) {
                return { ...serie, data: dailyRevenueArray };
              }
              return serie;
            }),
          };
        } else {
          // Add "Revenue" series as it does not exist yet
          return {
            ...prevState,
            series: [
              ...prevState.series,
              {
                name: "Revenue",
                data: dailyRevenueArray,
              },
            ],
          };
        }
      });
    }
  }, [dailyRevenueArray]);

  useEffect(() => {
    if (
      !!daysOfWeekArr &&
      daysOfWeekArr?.length > 0 &&
      !!dailyRevenueArray &&
      dailyRevenueArray?.length > 0
    ) {
      setChartOptions({
        ...options,
        xaxis: {
          ...options.xaxis,
          categories: daysOfWeekArr,
        },
        yaxis: {
          ...options.yaxis,
          // get the min & max values to the neareast hundred
          max: Math.ceil(Math.max(...dailyRevenueArray) / 100) * 100,
          min: Math.floor(Math.min(...dailyRevenueArray) / 100) * 100,
        },
      });
    }
  }, [daysOfWeekArr, dailyRevenueArray]);

  return (
    <div className="bg-white/40 dark:bg-card/40 backdrop-blur-md border border-border shadow-lg shadow-black/5 p-6 col-span-12 rounded-2xl transition-all duration-300 xl:col-span-8 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap mb-6">
        <div className="flex w-full flex-wrap gap-6 sm:gap-8">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-[#3C50E0] ring-4 ring-[#3C50E0]/10"></span>
            <div>
              <p className="text-sm font-bold text-foreground">Total Profit</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Last 7 Days</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-[#80CAEE] ring-4 ring-[#80CAEE]/10"></span>
            <div>
              <p className="text-sm font-bold text-foreground">Total Revenue</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Last 7 Days</p>
            </div>
          </div>
        </div>
        <div className="inline-flex items-center bg-gray-100 dark:bg-white/5 rounded-xl p-1 shadow-inner shrink-0">
          <button className="bg-white dark:bg-card text-foreground shadow-sm rounded-lg px-4 py-1.5 text-xs font-bold transition-all">
            Day
          </button>
          <button className="text-muted-foreground hover:text-foreground px-4 py-1.5 text-xs font-bold transition-all">
            Week
          </button>
          <button className="text-muted-foreground hover:text-foreground px-4 py-1.5 text-xs font-bold transition-all">
            Month
          </button>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <div id="chartOne" className="-ml-4 h-full">
          <ReactApexChart
            options={chartOptions}
            series={state.series}
            type="area"
            height="100%"
          />
        </div>
      </div>
    </div>
  );
};

export default RevenueAndProfitChart;
