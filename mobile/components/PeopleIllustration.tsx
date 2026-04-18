import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { colors as C } from '../lib/theme';

interface Props {
  width?: number;
  height?: number;
}

export function PeopleIllustration({ width = 200, height = 180 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 180" fill="none">
      <Defs>
        <LinearGradient id="gradBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={C.primary} stopOpacity="0.15" />
          <Stop offset="1" stopColor={C.secondary} stopOpacity="0.08" />
        </LinearGradient>
        <LinearGradient id="gradPerson1" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.primary} stopOpacity="0.9" />
          <Stop offset="1" stopColor={C.primaryDark} stopOpacity="0.7" />
        </LinearGradient>
        <LinearGradient id="gradPerson2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.secondary} stopOpacity="0.9" />
          <Stop offset="1" stopColor="#0066cc" stopOpacity="0.7" />
        </LinearGradient>
        <LinearGradient id="gradPerson3" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#a855f7" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#7c3aed" stopOpacity="0.7" />
        </LinearGradient>
        <LinearGradient id="gradCard" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={C.surface} stopOpacity="1" />
          <Stop offset="1" stopColor={C.surfaceRaised} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Background circle glow */}
      <Ellipse cx="100" cy="140" rx="80" ry="18" fill={C.primary} fillOpacity="0.06" />

      {/* Card behind left person */}
      <Rect x="14" y="66" width="70" height="76" rx="14" fill="url(#gradCard)" stroke={C.border} strokeWidth="1" />

      {/* Card behind right person */}
      <Rect x="116" y="66" width="70" height="76" rx="14" fill="url(#gradCard)" stroke={C.border} strokeWidth="1" />

      {/* Card center main */}
      <Rect x="45" y="54" width="110" height="88" rx="16" fill="url(#gradCard)" stroke={C.primary} strokeWidth="1" strokeOpacity="0.4" />

      {/* Left person — avatar circle */}
      <Circle cx="49" cy="80" r="18" fill="url(#gradPerson2)" />
      {/* left person head */}
      <Circle cx="49" cy="75" r="7" fill={C.bg} fillOpacity="0.6" />
      {/* left person body */}
      <Path d="M36 98 Q49 90 62 98 L62 142 Q49 138 36 142 Z" fill="url(#gradPerson2)" fillOpacity="0.5" />

      {/* Right person — avatar circle */}
      <Circle cx="151" cy="80" r="18" fill="url(#gradPerson3)" />
      <Circle cx="151" cy="75" r="7" fill={C.bg} fillOpacity="0.6" />
      <Path d="M138 98 Q151 90 164 98 L164 142 Q151 138 138 142 Z" fill="url(#gradPerson3)" fillOpacity="0.5" />

      {/* Center main person */}
      <Circle cx="100" cy="78" r="22" fill="url(#gradPerson1)" />
      <Circle cx="100" cy="72" r="9" fill={C.bg} fillOpacity="0.6" />
      <Path d="M82 103 Q100 94 118 103 L118 155 Q100 150 82 155 Z" fill="url(#gradPerson1)" fillOpacity="0.6" />

      {/* Center card info lines */}
      <Rect x="62" y="108" width="50" height="4" rx="2" fill={C.text} fillOpacity="0.3" />
      <Rect x="68" y="118" width="38" height="3" rx="1.5" fill={C.textMuted} fillOpacity="0.4" />
      <Rect x="74" y="127" width="26" height="3" rx="1.5" fill={C.textFaint} fillOpacity="0.5" />

      {/* Small plus badge top right of center card */}
      <Circle cx="155" cy="55" r="10" fill={C.primary} fillOpacity="0.9" />
      <Rect x="151" y="54" width="8" height="2" rx="1" fill={C.bg} />
      <Rect x="154" y="51" width="2" height="8" rx="1" fill={C.bg} />

      {/* Small dot sparkles */}
      <Circle cx="30" cy="52" r="3" fill={C.primary} fillOpacity="0.4" />
      <Circle cx="170" cy="48" r="2" fill={C.secondary} fillOpacity="0.5" />
      <Circle cx="182" cy="72" r="2.5" fill="#a855f7" fillOpacity="0.4" />
      <Circle cx="18" cy="90" r="2" fill={C.primary} fillOpacity="0.3" />
    </Svg>
  );
}
