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

  // Common components
  export class AlphaPicker extends React.Component<ColorPickerProps> {}
  export class BlockPicker extends React.Component<ColorPickerProps> {}
  export class ChromePicker extends React.Component<ColorPickerProps> {}
  export class CirclePicker extends React.Component<ColorPickerProps> {}
  export class CompactPicker extends React.Component<ColorPickerProps> {}
  export class GithubPicker extends React.Component<ColorPickerProps> {}
  export class HuePicker extends React.Component<ColorPickerProps> {}
  export class MaterialPicker extends React.Component<ColorPickerProps> {}
  export class PhotoshopPicker extends React.Component<ColorPickerProps> {}
  export class SketchPicker extends React.Component<ColorPickerProps> {}
  export class SliderPicker extends React.Component<ColorPickerProps> {}
  export class SwatchesPicker extends React.Component<ColorPickerProps> {}
  export class TwitterPicker extends React.Component<ColorPickerProps> {}
  export class CustomPicker extends React.Component<ColorPickerProps> {}
}
