import { Fragment, ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, Line, Path, Pattern, Rect, Text as SvgText } from "react-native-svg";
import { PAPER, PAPER_FONTS, PAPER_SPACING } from "@/theme/newspaper-theme";

export type ChartDatum = { label: string; value: number; highlight?: boolean };
export type ChartReferenceLine = { value: number; label: string };
export type LineSeries = { label: string; values: (number | null)[]; highlight?: boolean };
export type ChartAnnotation = { index: number; label: string };

export function formatChartValue(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

export function chartDomain(values: number[]): [number, number] {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return [0, 1];
  const min = Math.min(0, ...finite);
  const max = Math.max(0, ...finite);
  if (min === max) return [0, Math.max(1, max)];
  const step = tickStep(min, max, 4);
  if (!step) return [min, max];
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

export function chartTicks(min: number, max: number, count = 4) {
  const step = tickStep(min, max, count);
  if (!step || !Number.isFinite(step)) return [min, 0, max].filter((value, index, all) => all.indexOf(value) === index);
  const first = Math.ceil(min / step);
  const last = Math.floor(max / step);
  return Array.from({ length: Math.max(1, last - first + 1) }, (_, index) => Number(((first + index) * step).toPrecision(12)));
}

export function chartScale(value: number, min: number, max: number, start: number, end: number) {
  if (min === max) return (start + end) / 2;
  return start + ((value - min) / (max - min)) * (end - start);
}

function tickStep(min: number, max: number, count: number) {
  const rough = (max - min) / count;
  if (!Number.isFinite(rough) || rough <= 0) return 0;
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
}

function shortLabel(label: string, max = 12) {
  return label.length > max ? `${label.slice(0, Math.max(1, max - 1))}…` : label;
}

export function ChartFrame({ title, description, number, source, note, children }: { title: string; description?: string; number?: string; source?: string; note?: string; children: ReactNode }) {
  return (
    <View style={chartStyles.frame}>
      <View style={chartStyles.header}>
        {number ? <Text style={chartStyles.number}>{number}</Text> : null}
        <Text style={chartStyles.title}>{title}</Text>
        {description ? <Text style={chartStyles.description}>{description}</Text> : null}
      </View>
      {children}
      {source || note ? (
        <View style={chartStyles.caption}>
          {source ? <Text style={chartStyles.captionText}>SOURCE: {source}</Text> : null}
          {note ? <Text style={chartStyles.captionText}>{note}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export function ChartDataTable({ label, headers, rows }: { label: string; headers: string[]; rows: string[][] }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={chartStyles.dataTable}>
      <Pressable onPress={() => setOpen((value) => !value)} accessibilityRole="button" accessibilityLabel={`${open ? "Hide" : "View"} data for ${label}`}>
        <Text style={chartStyles.dataToggle}>{open ? "▾ Hide data" : "▸ View data"}</Text>
      </Pressable>
      {open ? (
        <View style={chartStyles.table}>
          <View style={chartStyles.tableRow}>
            {headers.map((header) => <Text key={header} style={chartStyles.tableHeader}>{header}</Text>)}
          </View>
          {rows.map((row, index) => (
            <View key={`${row[0]}-${index}`} style={chartStyles.tableRow}>
              {row.map((cell, cellIndex) => <Text key={`${cell}-${cellIndex}`} style={[chartStyles.tableCell, cellIndex === 0 ? chartStyles.tableCellLabel : null]}>{cell}</Text>)}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function EditorialBarChart({ label, data, unit, orientation = "horizontal", referenceLine, onSelect }: { label: string; data: ChartDatum[]; unit?: string; orientation?: "horizontal" | "vertical"; referenceLine?: ChartReferenceLine; onSelect?: (datum: ChartDatum) => void }) {
  const { width: screenWidth } = useWindowDimensions();
  const [selected, setSelected] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const width = Math.max(180, Math.min(720, containerWidth || screenWidth - 48));
  const height = orientation === "horizontal" ? Math.max(180, data.length * 54 + 40) : 292;
  const valid = data.every((datum) => Number.isFinite(datum.value)) && (!referenceLine || Number.isFinite(referenceLine.value));
  const [min, max] = chartDomain([...data.map((datum) => datum.value), ...(referenceLine ? [referenceLine.value] : [])]);
  const ticks = chartTicks(min, max, width < 400 ? 2 : 4);
  const left = orientation === "horizontal" ? 8 : 64;
  const right = width - 16;
  const top = orientation === "horizontal" ? 24 : 30;
  const bottom = orientation === "horizontal" ? data.length * 54 + 8 : 224;
  const baseline = chartScale(0, min, max, bottom, top);
  const selectedDatum = selected === null ? null : data[selected];

  const choose = (datum: ChartDatum, index: number) => {
    setSelected(index);
    onSelect?.(datum);
  };

  if (!valid) return <Text style={chartStyles.message}>Invalid chart data.</Text>;
  if (!data.length) return <Text style={chartStyles.message}>No data available.</Text>;

  return (
    <View onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}>
      {unit ? <Text style={chartStyles.unit}>{unit}</Text> : null}
      <Svg width={width} height={height} accessibilityLabel={label}>
        {ticks.map((tick) => {
          const position = orientation === "horizontal" ? chartScale(tick, min, max, bottom, top) : chartScale(tick, min, max, bottom, top);
          return (
            <SvgText key={`tick-${tick}`} x={orientation === "horizontal" ? left - 8 : left - 6} y={position + 4} fill={PAPER.secondary} fontFamily={PAPER_FONTS.meta} fontSize={10} textAnchor="end">{shortLabel(formatChartValue(tick), 8)}</SvgText>
          );
        })}
        {orientation === "horizontal" ? data.map((datum, index) => {
          const y = index * 54 + 30;
          const valueX = chartScale(datum.value, min, max, left, right);
          const x = Math.min(baseline, valueX);
          const barWidth = Math.abs(valueX - baseline);
          return (
            <Fragment key={`${datum.label}-${index}`}>
              <Line x1={left} x2={right} y1={y + 5} y2={y + 5} stroke={PAPER.hairline} strokeWidth={0.6} />
              <Rect x={x} y={y} width={Math.max(1, barWidth)} height={10} fill={datum.highlight || selected === index ? PAPER.ink : data.some((item) => item.highlight) ? PAPER.secondary : PAPER.ink} onPress={() => choose(datum, index)} />
              <SvgText x={left} y={index * 54 + 17} fill={PAPER.body} fontFamily={PAPER_FONTS.meta} fontSize={11} textAnchor="start">{shortLabel(datum.label, Math.max(8, width - 112))}</SvgText>
              <SvgText x={right} y={index * 54 + 17} fill={PAPER.ink} fontFamily={PAPER_FONTS.metaMedium} fontSize={11} textAnchor="end">{shortLabel(formatChartValue(datum.value), 12)}</SvgText>
            </Fragment>
          );
        }) : data.map((datum, index) => {
          const step = (right - left) / Math.max(1, data.length);
          const x = left + step * index + step / 2;
          const valueY = chartScale(datum.value, min, max, bottom, top);
          const y = Math.min(baseline, valueY);
          return (
            <Fragment key={`${datum.label}-${index}`}>
              <Line x1={x} x2={x} y1={top} y2={bottom} stroke={PAPER.hairline} strokeWidth={0.6} />
              <Rect x={x - step * 0.24} y={y} width={step * 0.48} height={Math.max(1, Math.abs(valueY - baseline))} fill={datum.highlight || selected === index ? PAPER.ink : PAPER.secondary} onPress={() => choose(datum, index)} />
              <SvgText x={x} y={bottom + 24} fill={PAPER.body} fontFamily={PAPER_FONTS.meta} fontSize={11} textAnchor="middle">{shortLabel(datum.label, Math.max(4, step - 6))}</SvgText>
            </Fragment>
          );
        })}
        <Line x1={orientation === "horizontal" ? left : left} x2={right} y1={orientation === "horizontal" ? baseline : baseline} y2={baseline} stroke={PAPER.ink} strokeWidth={0.8} />
        {referenceLine ? <Line x1={orientation === "horizontal" ? chartScale(referenceLine.value, min, max, left, right) : left} x2={orientation === "horizontal" ? chartScale(referenceLine.value, min, max, left, right) : right} y1={orientation === "horizontal" ? top : chartScale(referenceLine.value, min, max, bottom, top)} y2={orientation === "horizontal" ? bottom : chartScale(referenceLine.value, min, max, bottom, top)} stroke={PAPER.secondary} strokeWidth={0.8} strokeDasharray="3 4" /> : null}
      </Svg>
      {selectedDatum ? <Text style={chartStyles.selection}>{selectedDatum.label}: {formatChartValue(selectedDatum.value)}{unit ? ` ${unit}` : ""}</Text> : null}
      {referenceLine ? <View style={chartStyles.referenceLabel}><View style={chartStyles.referenceDash} /><Text style={chartStyles.referenceText}>{referenceLine.label}: {formatChartValue(referenceLine.value)}{unit ? ` ${unit}` : ""}</Text></View> : null}
      <ChartDataTable label={label} headers={["Category", unit || "Value"]} rows={data.map((datum) => [datum.label, formatChartValue(datum.value)])} />
    </View>
  );
}

export type GroupedBarDatum = { label: string; values: ChartDatum[] };

export function EditorialGroupedBarChart({ label, data, unit }: { label: string; data: GroupedBarDatum[]; unit?: string }) {
  const { width: screenWidth } = useWindowDimensions();
  const [selected, setSelected] = useState<{ group: GroupedBarDatum; datum: ChartDatum } | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const width = Math.max(180, Math.min(720, containerWidth || screenWidth - 48));
  const height = 292;
  const valid = data.every((group) => group.values.every((datum) => Number.isFinite(datum.value)));
  const flattened = data.flatMap((group) => group.values.map((value) => value.value));
  const [min, max] = chartDomain(flattened);
  const left = 34;
  const right = width - 12;
  const top = 30;
  const bottom = 224;
  const baseline = chartScale(0, min, max, bottom, top);
  const step = (right - left) / Math.max(1, data.length);
  const seriesCount = Math.max(1, Math.max(...data.map((group) => group.values.length), 0));

  if (!valid) return <Text style={chartStyles.message}>Invalid chart data.</Text>;
  if (!data.length) return <Text style={chartStyles.message}>No data available.</Text>;

  return (
    <View onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}>
      {unit ? <Text style={chartStyles.unit}>{unit}</Text> : null}
      <Svg width={width} height={height} accessibilityLabel={label}>
        {chartTicks(min, max).map((tick) => {
          const y = chartScale(tick, min, max, bottom, top);
          return <SvgText key={tick} x={left - 8} y={y + 4} fill={PAPER.secondary} fontFamily={PAPER_FONTS.meta} fontSize={11} textAnchor="end">{shortLabel(formatChartValue(tick), 7)}</SvgText>;
        })}
        {data.map((group, groupIndex) => {
          const groupWidth = step * 0.7;
          const barWidth = groupWidth / seriesCount - 3;
          const startX = left + step * groupIndex + (step - groupWidth) / 2;
          return (
            <Fragment key={`${group.label}-${groupIndex}`}>
              <Line x1={left + step * groupIndex + step / 2} x2={left + step * groupIndex + step / 2} y1={top} y2={bottom} stroke={PAPER.hairline} strokeWidth={0.5} />
              {group.values.map((datum, datumIndex) => {
                const valueY = chartScale(datum.value, min, max, bottom, top);
                const y = Math.min(valueY, baseline);
                const x = startX + datumIndex * (barWidth + 3);
                return <Rect key={`${datum.label}-${datumIndex}`} x={x} y={y} width={barWidth} height={Math.max(1, Math.abs(valueY - baseline))} fill={datum.highlight ? PAPER.secondary : PAPER.ink} onPress={() => setSelected({ group, datum })} />;
              })}
              <SvgText x={left + step * groupIndex + step / 2} y={bottom + 24} fill={PAPER.body} fontFamily={PAPER_FONTS.meta} fontSize={11} textAnchor="middle">{shortLabel(group.label, 8)}</SvgText>
            </Fragment>
          );
        })}
        <Line x1={left} x2={right} y1={baseline} y2={baseline} stroke={PAPER.ink} strokeWidth={0.8} />
      </Svg>
      {selected ? <Text style={chartStyles.selection}>{selected.group.label} · {selected.datum.label}: {formatChartValue(selected.datum.value)}{unit ? ` ${unit}` : ""}</Text> : null}
      <ChartDataTable label={label} headers={["Period", ...Array.from(new Set(data.flatMap((group) => group.values.map((datum) => datum.label))))]} rows={data.map((group) => [group.label, ...group.values.map((datum) => formatChartValue(datum.value))])} />
    </View>
  );
}

export function EditorialLineChart({ label, labels, series, unit, annotations = [], referenceLine }: { label: string; labels: string[]; series: LineSeries[]; unit?: string; annotations?: ChartAnnotation[]; referenceLine?: ChartReferenceLine }) {
  const { width: screenWidth } = useWindowDimensions();
  const [selected, setSelected] = useState<{ series: LineSeries; index: number; value: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const width = Math.max(180, Math.min(720, containerWidth || screenWidth - 48));
  const height = 276;
  const values = series.flatMap((item) => item.values.filter((value): value is number => value !== null));
  const valid = series.length > 0 && series.every((item) => item.values.length === labels.length && item.values.every((value) => value === null || Number.isFinite(value))) && (!referenceLine || Number.isFinite(referenceLine.value)) && annotations.every((annotation) => Number.isInteger(annotation.index) && annotation.index >= 0 && annotation.index < labels.length);
  if (!valid) return <Text style={chartStyles.message}>Invalid chart data.</Text>;
  if (!labels.length || !values.length) return <Text style={chartStyles.message}>No data available.</Text>;

  const [min, max] = chartDomain([...values, ...(referenceLine ? [referenceLine.value] : [])]);
  const showEndLabels = width >= 480 && series.length <= 4 && series.every((item) => item.values[item.values.length - 1] !== null);
  const left = 64;
  const right = width - (showEndLabels ? 116 : 16);
  const top = 30;
  const bottom = 234;
  const x = (index: number) => labels.length === 1 ? (left + right) / 2 : left + (index * (right - left)) / (labels.length - 1);
  const y = (value: number) => chartScale(value, min, max, bottom, top);
  const labelEvery = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor((right - left) / 76))));
  const tickIndexes = labels.map((_, index) => index).filter((index) => index === 0 || index === labels.length - 1 || (index % labelEvery === 0 && index < labels.length - 1 - labelEvery / 2));
  const endpoints = series.flatMap((item, seriesIndex) => {
    const last = item.values.reduce<number>((found, value, index) => value === null ? found : index, -1);
    return last < 0 ? [] : [{ seriesIndex, last, pointY: y(item.values[last]!), labelY: y(item.values[last]!) }];
  }).sort((a, b) => a.pointY - b.pointY);
  endpoints.forEach((point, index) => { point.labelY = Math.max(point.pointY, index ? endpoints[index - 1].labelY + 34 : top); });
  for (let index = endpoints.length - 1; index >= 0; index -= 1) {
    endpoints[index].labelY = Math.min(endpoints[index].labelY, index === endpoints.length - 1 ? bottom - 14 : endpoints[index + 1].labelY - 34);
  }

  return (
    <View onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}>
      {unit ? <Text style={chartStyles.unit}>{unit}</Text> : null}
      <Svg width={width} height={height} accessibilityLabel={label}>
        {chartTicks(min, max).map((tick) => <Line key={tick} x1={left} x2={right} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? PAPER.ink : PAPER.hairline} strokeWidth={tick === 0 ? 0.8 : 0.6} />)}
        {chartTicks(min, max).map((tick) => <SvgText key={`label-${tick}`} x={left - 8} y={y(tick) + 4} fill={PAPER.secondary} fontFamily={PAPER_FONTS.meta} fontSize={11} textAnchor="end">{shortLabel(formatChartValue(tick), 7)}</SvgText>)}
        {tickIndexes.map((index) => <SvgText key={`${labels[index]}-${index}`} x={x(index)} y={bottom + 24} fill={PAPER.secondary} fontFamily={PAPER_FONTS.meta} fontSize={11} textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"}>{shortLabel(labels[index], Math.min(76, (right - left) / Math.max(1, tickIndexes.length - 1)))}</SvgText>)}
        {annotations.map((annotation, index) => <Fragment key={`${annotation.index}-${index}`}><Line x1={x(annotation.index)} x2={x(annotation.index)} y1={top} y2={bottom} stroke={PAPER.hairline} strokeDasharray="2 4" /><SvgText x={x(annotation.index)} y={top - 12} fill={PAPER.secondary} fontFamily={PAPER_FONTS.metaBold} fontSize={10} textAnchor="middle">{String(index + 1).padStart(2, "0")}</SvgText></Fragment>)}
        {referenceLine ? <Line x1={left} x2={right} y1={y(referenceLine.value)} y2={y(referenceLine.value)} stroke={PAPER.secondary} strokeWidth={0.8} strokeDasharray="3 4" /> : null}
        {series.map((item, seriesIndex) => {
          let connected = false;
          const path = item.values.map((value, index) => {
            if (value === null) { connected = false; return ""; }
            const command = connected ? "L" : "M";
            connected = true;
            return `${command}${x(index)},${y(value)}`;
          }).join(" ");
          const color = item.highlight ? PAPER.ink : PAPER.secondary;
          return (
            <Fragment key={item.label}>
              <Path d={path} fill="none" stroke={color} strokeWidth={item.highlight ? 2 : 1.4} strokeDasharray={seriesIndex % 2 ? "6 4" : undefined} />
              {item.values.map((value, index) => value === null ? null : <Circle key={`${item.label}-${index}`} cx={x(index)} cy={y(value)} r={index === item.values.length - 1 ? 3 : 2.3} fill={index === item.values.length - 1 ? color : PAPER.page} stroke={color} strokeWidth={1.2} onPress={() => setSelected({ series: item, index, value })} />)}
              {showEndLabels && endpoints.filter((point) => point.seriesIndex === seriesIndex).map((point) => <Fragment key={`end-${item.label}`}><Path d={`M${x(point.last) + 5},${point.pointY} L${right + 8},${point.labelY} H${right + 14}`} fill="none" stroke={PAPER.hairline} strokeWidth={0.6} /><SvgText x={right + 18} y={point.labelY - 3} fill={PAPER.secondary} fontFamily={PAPER_FONTS.meta} fontSize={10}>{shortLabel(item.label, 90)}</SvgText><SvgText x={right + 18} y={point.labelY + 15} fill={PAPER.ink} fontFamily={PAPER_FONTS.display} fontSize={20}>{shortLabel(formatChartValue(item.values[point.last]!), 12)}</SvgText></Fragment>)}
            </Fragment>
          );
        })}
      </Svg>
      <View style={chartStyles.legend}>
        {series.map((item) => <View key={item.label} style={chartStyles.legendItem}><View style={[chartStyles.legendLine, { backgroundColor: item.highlight ? PAPER.ink : PAPER.secondary }]} /><Text style={chartStyles.legendText}>{item.label}</Text></View>)}
      </View>
      {referenceLine ? <View style={chartStyles.referenceLabel}><View style={chartStyles.referenceDash} /><Text style={chartStyles.referenceText}>{referenceLine.label}: {formatChartValue(referenceLine.value)}{unit ? ` ${unit}` : ""}</Text></View> : null}
      {annotations.length ? <View style={chartStyles.annotations}>{annotations.map((annotation, index) => <Text key={`${annotation.index}-${index}`} style={chartStyles.annotationText}>{String(index + 1).padStart(2, "0")}. {labels[annotation.index]} — {annotation.label}</Text>)}</View> : null}
      {selected ? <Text style={chartStyles.selection}>{selected.series.label} · {labels[selected.index]}: {formatChartValue(selected.value)}{unit ? ` ${unit}` : ""}</Text> : null}
      <ChartDataTable label={label} headers={["Category", ...series.map((item) => item.label)]} rows={labels.map((category, index) => [category, ...series.map((item) => item.values[index] === null ? "—" : formatChartValue(item.values[index]!))])} />
    </View>
  );
}

function polarPoint(center: number, radius: number, angle: number) {
  return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
}

function piePath(center: number, radius: number, start: number, end: number) {
  const startPoint = polarPoint(center, radius, start);
  const endPoint = polarPoint(center, radius, end);
  return `M${center},${center} L${startPoint.x},${startPoint.y} A${radius},${radius} 0 ${end - start > Math.PI ? 1 : 0},1 ${endPoint.x},${endPoint.y} Z`;
}

function PatternSwatch({ index }: { index: number }) {
  const kind = index % 4;
  return (
    <View style={chartStyles.legendSwatch}>
      {kind === 0 ? <View style={chartStyles.swatchSolid} /> : null}
      {kind === 1 ? <View style={chartStyles.swatchLine} /> : null}
      {kind === 2 ? <View style={chartStyles.swatchDot} /> : null}
      {kind === 3 ? <><View style={[chartStyles.swatchLine, { transform: [{ rotate: "45deg" }] }]} /><View style={[chartStyles.swatchLine, { transform: [{ rotate: "-45deg" }] }]} /></> : null}
    </View>
  );
}

export function EditorialPieChart({ label, data, variant = "pie", unit }: { label: string; data: ChartDatum[]; variant?: "pie" | "donut"; unit?: string }) {
  const { width: screenWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const valid = data.every((datum) => Number.isFinite(datum.value) && datum.value >= 0);
  const total = data.reduce((sum, datum) => sum + datum.value, 0);
  if (!valid) return <Text style={chartStyles.message}>Invalid chart data.</Text>;
  if (!data.length) return <Text style={chartStyles.message}>No data available.</Text>;
  if (total <= 0) return <Text style={chartStyles.message}>The total is zero; shares cannot be calculated.</Text>;

  let angle = -Math.PI / 2;
  const radius = 104;
  const center = 120;
  const availableWidth = containerWidth || screenWidth - 48;
  const wide = availableWidth >= 480;
  const pieSize = Math.min(240, Math.max(180, availableWidth));
  const shares = data.map((datum) => datum.value / total);
  const selectedDatum = selected === null ? null : data[selected];
  const patternPrefix = `newspaper-pie-${label.replace(/[^a-zA-Z0-9]/g, "-")}`;

  const patternId = (index: number) => `${patternPrefix}-${index}`;
  const patternInk = (index: number) => index % 4 === 0 ? PAPER.ink : index % 4 === 1 ? PAPER.ink : index % 4 === 2 ? PAPER.body : PAPER.secondary;

  return (
    <View onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}>
      {unit ? <Text style={chartStyles.unit}>{unit}</Text> : null}
      <View style={[chartStyles.pieLayout, wide ? chartStyles.pieLayoutWide : null]}>
        <Svg width={pieSize} height={pieSize} viewBox="0 0 240 240" accessibilityLabel={label}>
          <Defs>
            {data.map((_, index) => (
              <Pattern key={patternId(index)} id={patternId(index)} x="0" y="0" width={7 + (index % 3)} height={7 + (index % 3)} patternUnits="userSpaceOnUse" patternTransform={`rotate(${index % 2 ? 45 : -45})`}>
                <Rect width={12} height={12} fill={index % 4 === 0 ? patternInk(index) : PAPER.page} />
                {index % 4 === 1 ? <Line x1="0" x2="0" y1="0" y2="12" stroke={patternInk(index)} strokeWidth={0.9} /> : null}
                {index % 4 === 2 ? <Circle cx="3.5" cy="3.5" r="0.85" fill={patternInk(index)} /> : null}
                {index % 4 === 3 ? <Path d="M0,0 V12 M0,0 H12" fill="none" stroke={patternInk(index)} strokeWidth={0.55} /> : null}
              </Pattern>
            ))}
          </Defs>
          {data.map((datum, index) => {
            const start = angle;
            angle += shares[index] * Math.PI * 2;
            if (shares[index] === 0) return null;
            return <Path key={`${datum.label}-${index}`} d={piePath(center, radius, start, angle)} fill={`url(#${patternId(index)})`} stroke={PAPER.page} strokeWidth={1.5} onPress={() => setSelected(index)} />;
          })}
          <Circle cx={center} cy={center} r={radius} fill="none" stroke={PAPER.ink} strokeWidth={0.8} />
          {variant === "donut" ? <><Circle cx={center} cy={center} r={56} fill={PAPER.page} stroke={PAPER.ink} strokeWidth={0.8} /><SvgText x={center} y={center + 5} fill={PAPER.ink} fontFamily={PAPER_FONTS.display} fontSize={26} textAnchor="middle">{selectedDatum ? `${Math.round(shares[selected!] * 100)}%` : "100%"}</SvgText></> : null}
        </Svg>
        <View style={[chartStyles.pieLegend, wide ? chartStyles.pieLegendWide : null]}>
          {data.map((datum, index) => <Pressable key={datum.label} onPress={() => setSelected(index)} style={chartStyles.pieLegendRow}><PatternSwatch index={index} /><Text style={chartStyles.pieLegendLabel} numberOfLines={2}>{datum.label}</Text><Text style={chartStyles.pieLegendValue}>{Math.round(shares[index] * 100)}%</Text></Pressable>)}
        </View>
      </View>
      {selectedDatum ? <Text style={chartStyles.selection}>{selectedDatum.label}: {formatChartValue(selectedDatum.value)} ({Math.round(shares[selected!] * 100)}%)</Text> : null}
      <ChartDataTable label={label} headers={["Category", unit || "Value", "Share"]} rows={data.map((datum, index) => [datum.label, formatChartValue(datum.value), `${Math.round(shares[index] * 100)}%`])} />
    </View>
  );
}

const chartStyles = StyleSheet.create({
  frame: { width: "100%", borderTopWidth: 1, borderTopColor: PAPER.decorative, paddingTop: 18, marginBottom: PAPER_SPACING.xl },
  header: { marginBottom: PAPER_SPACING.lg },
  number: { fontFamily: PAPER_FONTS.metaMedium, color: PAPER.secondary, fontSize: 10, lineHeight: 14, letterSpacing: 1.4, marginBottom: 10 },
  title: { fontFamily: PAPER_FONTS.display, color: PAPER.ink, fontSize: 20, lineHeight: 28, letterSpacing: -0.4 },
  description: { marginTop: 7, fontFamily: PAPER_FONTS.body, color: PAPER.secondary, fontSize: 13, lineHeight: 22 },
  caption: { borderTopWidth: 1, borderTopColor: PAPER.hairline, paddingTop: PAPER_SPACING.md, marginTop: 14, gap: 3 },
  captionText: { fontFamily: PAPER_FONTS.meta, color: PAPER.secondary, fontSize: 11, lineHeight: 20 },
  unit: { fontFamily: PAPER_FONTS.metaMedium, color: PAPER.secondary, fontSize: 10, lineHeight: 15, letterSpacing: 0.25, marginBottom: PAPER_SPACING.sm },
  message: { paddingVertical: PAPER_SPACING.xl, fontFamily: PAPER_FONTS.body, color: PAPER.secondary, fontSize: 14 },
  selection: { borderTopWidth: 1, borderTopColor: PAPER.hairline, paddingTop: PAPER_SPACING.sm, marginTop: PAPER_SPACING.xs, fontFamily: PAPER_FONTS.metaMedium, color: PAPER.ink, fontSize: 12 },
  dataTable: { marginTop: PAPER_SPACING.md },
  dataToggle: { fontFamily: PAPER_FONTS.metaMedium, color: PAPER.secondary, fontSize: 10, letterSpacing: 0.25, paddingVertical: 10 },
  table: { borderTopWidth: 1, borderTopColor: PAPER.hairline },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: PAPER.hairline, paddingVertical: PAPER_SPACING.sm, gap: PAPER_SPACING.sm },
  tableHeader: { flex: 1, fontFamily: PAPER_FONTS.metaBold, color: PAPER.secondary, fontSize: 12, lineHeight: 18 },
  tableCell: { flex: 1, fontFamily: PAPER_FONTS.meta, color: PAPER.body, fontSize: 12, lineHeight: 18 },
  tableCellLabel: { fontFamily: PAPER_FONTS.metaMedium },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: PAPER_SPACING.md, marginTop: PAPER_SPACING.xs },
  legendItem: { flexDirection: "row", alignItems: "center", gap: PAPER_SPACING.xs },
  legendLine: { width: 24, height: 2 },
  legendText: { fontFamily: PAPER_FONTS.meta, color: PAPER.secondary, fontSize: 12 },
  referenceLabel: { flexDirection: "row", alignItems: "center", gap: PAPER_SPACING.sm, marginVertical: 10 },
  referenceDash: { width: 28, borderTopWidth: 1, borderTopColor: PAPER.secondary, borderStyle: "dashed" },
  referenceText: { flex: 1, fontFamily: PAPER_FONTS.meta, color: PAPER.secondary, fontSize: 11, lineHeight: 18 },
  annotations: { marginVertical: 10, gap: 4 },
  annotationText: { fontFamily: PAPER_FONTS.meta, color: PAPER.secondary, fontSize: 11, lineHeight: 20 },
  pieLayout: { width: "100%", alignItems: "center", gap: PAPER_SPACING.xl },
  pieLayoutWide: { flexDirection: "row", alignItems: "center", gap: PAPER_SPACING.xl },
  pieLegend: { width: "100%" },
  pieLegendWide: { flex: 1 },
  pieLegendRow: { flexDirection: "row", alignItems: "center", gap: PAPER_SPACING.sm, borderBottomWidth: 1, borderBottomColor: PAPER.hairline, paddingVertical: PAPER_SPACING.sm },
  legendSwatch: { width: 12, height: 12, overflow: "hidden", borderWidth: 1, borderColor: PAPER.ink, backgroundColor: PAPER.page, alignItems: "center", justifyContent: "center" },
  swatchSolid: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: PAPER.ink },
  swatchLine: { width: 1, height: 18, backgroundColor: PAPER.ink },
  swatchDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: PAPER.ink },
  pieLegendLabel: { flex: 1, fontFamily: PAPER_FONTS.meta, color: PAPER.body, fontSize: 12, lineHeight: 18 },
  pieLegendValue: { fontFamily: PAPER_FONTS.display, color: PAPER.ink, fontSize: 17 },
});
