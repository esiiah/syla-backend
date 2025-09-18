// frontend/src/components/ChartView.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, LogarithmicScale,
  BarElement, PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler
} from "chart.js";
import { Bar, Line, Pie, Scatter } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale,
  BarElement, PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler, ChartDataLabels
);

// ------- helpers -------
const parseNum = v => (v == null || v === "" ? 0 : +String(v).replace(/,/g, "") || 0);
const lerp = (a, b, t) => a + (b - a) * t;
const hexToRgb = h => { if (!h) return null; const n = h.replace("#",""); const x = parseInt(n.length===3?n.split("").map(c=>c+c).join(""):n,16); return {r:(x>>16)&255,g:(x>>8)&255,b:x&255}; };
const rgbToHex = ({r,g,b}) => "#" + [r,g,b].map(c=>c.toString(16).padStart(2,"0")).join("");
const interpolate = (stops,t) => { if(stops.length<2)return stops[0]||"#999"; const seg=(stops.length-1)*t,i=Math.min(Math.floor(seg),stops.length-2);const c1=hexToRgb(stops[i]),c2=hexToRgb(stops[i+1]);return rgbToHex({r:Math.round(lerp(c1.r,c2.r,seg-i)),g:Math.round(lerp(c1.g,c2.g,seg-i)),b:Math.round(lerp(c1.b,c2.b,seg-i))}); };
const trendline = vals => {const n=vals.length;if(n<2)return vals.map(()=>null);const xs=vals.map((_,i)=>i),ys=vals;const xm=xs.reduce((a,b)=>a+b,0)/n,ym=ys.reduce((a,b)=>a+b,0)/n;let num=0,den=0;for(let i=0;i<n;i++){num+=(xs[i]-xm)*(ys[i]-ym);den+=(xs[i]-xm)**2;}const m=den?num/den:0,b=ym-m*xm;return xs.map(x=>m*x+b);};
const themeText = () => (document?.body?.classList.contains("dark") ? "#E6EEF8" : "#0f172a");

// ------- component -------
export default function ChartView({ data=[], columns=[], types={}, options={}, chartTitle="", xAxis="", yAxis="", setXAxis=()=>{}, setYAxis=()=>{} }) {
  const ref = useRef(null);
  const [perColor,setPerColor]=useState([]), [editing,setEditing]=useState(null);

  useEffect(()=>{ if(!xAxis&&columns[0])setXAxis(columns[0]); if(!yAxis&&columns[1])setYAxis(columns[1]); setPerColor(new Array(data.length).fill(null)); },[columns,data.length]);

  const labels = useMemo(()=>data.map((r,i)=>r?.[xAxis]??`Row ${i+1}`),[data,xAxis]);
  const values = useMemo(()=>data.map(r=>parseNum(r?.[yAxis])),[data,yAxis]);
  const compareVals = useMemo(()=>options.compareField?data.map(r=>parseNum(r?.[options.compareField])):null,[data,options.compareField]);

  // sort + mapping
  const pairs = labels.map((l,i)=>({l,v:values[i],c:compareVals?compareVals[i]:null,raw:data[i],i}));
  if(options.sort==="asc")pairs.sort((a,b)=>a.v-b.v);
  if(options.sort==="desc")pairs.sort((a,b)=>b.v-a.v);
  const lbls=pairs.map(p=>p.l), vals=pairs.map(p=>p.v), cmp=compareVals?pairs.map(p=>p.c):null, map=pairs.map(p=>p.i);

  const minPos=Math.max(1e-6,Math.min(...[...vals,...(cmp||[])].filter(v=>v>0))||1);
  const safeVals=options.logScale?vals.map(v=>v>0?v:minPos*0.01):vals;
  const safeCmp=cmp? (options.logScale?cmp.map(v=>v>0?v:minPos*0.01):cmp):null;

  // chartData
  const chartData=useMemo(()=>{
    const base=options.color||"#2563eb", stops=options.gradientStops?.length?options.gradientStops:[base,base],N=lbls.length||1;
    const pickColor=(i)=>perColor[map[i]]|| (options.gradient?interpolate(stops,N===1?0:i/(N-1)):base);

    if(options.type==="pie") return {labels:lbls,datasets:[{label:yAxis||"Value",data:vals,backgroundColor:vals.map((_,i)=>pickColor(i)),borderColor:"#fff",borderWidth:1}]};
    if(options.type==="scatter") return {labels:lbls,datasets:[{label:yAxis||"Value",data:safeVals.map((v,i)=>({x:i,y:v})),backgroundColor:safeVals.map((_,i)=>pickColor(i)),showLine:false,pointRadius:4}]};

    const core={label:yAxis||"Value",type:options.type==="line"?"line":"bar",data:safeVals,originalData:vals,backgroundColor:vals.map((_,i)=>pickColor(i)),borderColor:base};
    const ds=[core];
    if(safeCmp)ds.push({label:options.compareField,type:core.type,data:safeCmp,originalData:cmp,backgroundColor:cmp.map((_,i)=>pickColor(i)),yAxisID:"y1"});
    if(options.trendline)ds.push({label:`${yAxis} trend`,type:"line",data:trendline(safeVals),borderColor:"#222",fill:false,pointRadius:0});
    return{labels:lbls,datasets:ds};
  },[options.type,lbls,vals,safeVals,perColor,options.gradient,options.gradientStops,options.color,options.compareField,safeCmp,options.trendline,yAxis,map]);

  // chart options
  const opts=useMemo(()=>{
    const tc=themeText(),ys=options.logScale?"logarithmic":"linear";
    const o={maintainAspectRatio:false,responsive:true,plugins:{legend:{labels:{color:tc}},datalabels:{color:tc,display:ctx=>ctx.dataset?.datalabels?.display??!!options.showLabels},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${ctx.dataset.originalData?.[ctx.dataIndex]??ctx.formattedValue}`}}},scales:{x:{ticks:{color:tc}},y:{type:ys,ticks:{color:tc}}}};
    if(options.compareField&&options.type!=="pie"&&options.type!=="scatter")o.scales.y1={position:"right",grid:{drawOnChartArea:false},ticks:{color:tc}};
    if(options.type==="scatter")o.scales.x={type:"linear",ticks:{color:tc,callback:v=>(Number.isInteger(v)&&lbls[v])?lbls[v]:"",stepSize:1},min:-.5,max:lbls.length-.5};
    if(options.type==="pie")delete o.scales;
    return o;
  },[options,lbls,yAxis]);

  const Comp=options.type==="line"?Line:options.type==="pie"?Pie:options.type==="scatter"?Scatter:Bar;

  // exports
  const dlImg=f=>{const c=ref.current;if(!c?.toBase64Image)return;const url=c.toBase64Image(f==="jpeg"?"image/jpeg":"image/png");const a=document.createElement("a");a.href=url;a.download=`chart.${f}`;a.click();};
  const dlCSV=()=>{if(!data.length)return;const keys=Object.keys(data[0]);const rows=[keys.join(",")].concat(data.map(r=>keys.map(k=>`"${r[k]??""}"`).join(",")));const b=new Blob([rows.join("\n")],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download="data.csv";a.click();};
  const dlJSON=()=>{const b=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="data.json";a.click();};

  return (
    <div className="rounded-2xl bg-white border shadow-sm dark:bg-ink/80 dark:border-white/5 p-5">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-display text-sm mb-2">{chartTitle||"Visualization"}</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            <label>X:<select value={xAxis} onChange={e=>setXAxis(e.target.value)} className="ml-1 border rounded px-2 py-1">{columns.map(c=><option key={c}>{c}</option>)}</select></label>
            <label>Y:<select value={yAxis} onChange={e=>setYAxis(e.target.value)} className="ml-1 border rounded px-2 py-1">{columns.map(c=><option key={c}>{c}</option>)}</select></label>
          </div>
        </div>
        <div className="flex gap-2 text-xs items-center">
          <span>Export:</span>
          <button onClick={()=>dlImg("png")} className="px-2 py-1 border rounded">PNG</button>
          <button onClick={()=>dlImg("jpeg")} className="px-2 py-1 border rounded">JPEG</button>
          <button onClick={dlCSV} className="px-2 py-1 border rounded">CSV</button>
          <button onClick={dlJSON} className="px-2 py-1 border rounded">JSON</button>
        </div>
      </div>
      <div className="mt-3 rounded-xl p-3 bg-gradient-to-b from-white to-gray-50 border dark:from-black/30 dark:to-black/10">
        <div style={{height:360}}><Comp ref={ref} data={chartData} options={opts}/></div>
      </div>
      {editing&&<div className="mt-3 p-3 border rounded bg-white dark:bg-black/40 flex gap-3 items-center">Editing #{editing.index+1}<input type="color" onChange={e=>{const c=[...perColor];c[editing.index]=e.target.value;setPerColor(c);setEditing(null);}}/><button onClick={()=>setEditing(null)} className="px-2 py-1 border rounded">Close</button></div>}
    </div>
  );
}
