declare module 'react-color' {
  import * as React from 'react';

  export interface Color {
    hex: string;
    rgb: { r: number; g: number; b: number; a?: number };
    hsl: { h: number; s: number; l: number; a?: number };
  }

  export interface ColorResult {
    hex: string;
    rgb: { r: number; g: number; b: number; a?: number };
    hsl: { h: number; s: number; l: number; a?: number };
  }

  export interface ColorPickerProps {
    color?: string | Color;
    onChange?: (color: ColorResult) => void;
    onChangeComplete?: (color: ColorResult) => void;
    className?: string;
    style?: React.CSSProperties;
    width?: string;
    height?: string;
    disableAlpha?: boolean;
    presetColors?: string[];
    renderers?: any;
    triangle?: 'hide' | 'top-left' | 'top-right' | 'hide';
  }

  // 共通コンポーネント
  export const AlphaPicker: React.ComponentType<ColorPickerProps>;
  export const BlockPicker: React.ComponentType<ColorPickerProps>;
  export const ChromePicker: React.ComponentType<ColorPickerProps>;
  export const CirclePicker: React.ComponentType<ColorPickerProps>;
  export const CompactPicker: React.ComponentType<ColorPickerProps>;
  export const GithubPicker: React.ComponentType<ColorPickerProps>;
  export const HuePicker: React.ComponentType<ColorPickerProps>;
  export const MaterialPicker: React.ComponentType<ColorPickerProps>;
  export const PhotoshopPicker: React.ComponentType<ColorPickerProps>;
  export const SketchPicker: React.ComponentType<ColorPickerProps>;
  export const SliderPicker: React.ComponentType<ColorPickerProps>;
  export const SwatchesPicker: React.ComponentType<ColorPickerProps>;
  export const TwitterPicker: React.ComponentType<ColorPickerProps>;
  export const CustomPicker: React.ComponentType<ColorPickerProps>;
}
