import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Play, Activity } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const LoadTestSimulator = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [dataPoints, setDataPoints] = useState(Array(20).fill(15)); // baseline ~15ms
  
  useEffect(() => {
    let interval;
    if (isSimulating) {
      // Simulate spike then stabilize
      let step = 0;
      interval = setInterval(() => {
        step++;
        setDataPoints(prev => {
          const newArr = [...prev.slice(1)];
          let nextValue;
          
          if (step < 5) {
            // Initial spike
            nextValue = Math.floor(Math.random() * 50) + 100; // 100-150ms
          } else if (step < 10) {
            // Edge scaling kicks in
            nextValue = Math.floor(Math.random() * 30) + 40; // 40-70ms
          } else {
            // Stabilized
            nextValue = Math.floor(Math.random() * 5) + 12; // 12-17ms
          }
          
          newArr.push(nextValue);
          return newArr;
        });
        
        if (step >= 20) {
          setIsSimulating(false);
        }
      }, 500);
    } else {
      // Baseline idle
      interval = setInterval(() => {
        setDataPoints(prev => {
          const newArr = [...prev.slice(1)];
          newArr.push(Math.floor(Math.random() * 3) + 14); // 14-16ms
          return newArr;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isSimulating]);

  const chartData = {
    labels: Array(20).fill(''), // hide labels
    datasets: [
      {
        fill: true,
        label: 'Response Time (ms)',
        data: dataPoints,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: isSimulating ? 0 : 300 // smooth transition when not simulating
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 200,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#9CA3AF'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      }
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4 relative z-10">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="text-indigo-500" /> Edge Computing Load Test
          </h3>
          <p className="text-gray-400 text-sm mt-1">Global 99.99% Uptime Guarantee Dashboard</p>
        </div>
        
        <button 
          onClick={() => {
            if(!isSimulating) setIsSimulating(true);
          }}
          disabled={isSimulating}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${isSimulating ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'}`}
        >
          {isSimulating ? (
            <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> Simulating Load...</>
          ) : (
            <><Play size={16} /> Simulate 10k Concurrent Students</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 relative z-10">
        <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Current Latency</div>
          <div className="text-2xl font-mono text-white">{dataPoints[dataPoints.length - 1]}<span className="text-sm text-gray-500 ml-1">ms</span></div>
        </div>
        <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Edge Nodes</div>
          <div className="text-2xl font-mono text-white">42<span className="text-sm text-green-500 ml-2">Active</span></div>
        </div>
        <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Success Rate</div>
          <div className="text-2xl font-mono text-white">99.99<span className="text-sm text-gray-500 ml-1">%</span></div>
        </div>
      </div>

      <div className="h-48 relative z-10 w-full">
        <Line data={chartData} options={options} />
      </div>
      
      {/* Background glow */}
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
};

export default LoadTestSimulator;
