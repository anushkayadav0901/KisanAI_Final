# Kisaan Saathi Color Palette Documentation

## Overview
This document outlines the official matte color palette for Kisaan Saathi, designed with a modern, professional, and sophisticated look to enhance the user experience while maintaining agricultural themes.

## Primary Colors

### Hero Green - The Dominant Color
- **Hex**: `#63A361`
- **RGB**: RGB(99, 163, 97)
- **Usage**: Primary buttons, main headings, success states, dominant UI elements, hero sections
- **Description**: A sophisticated, matte forest green that serves as the primary brand color

### Warm Accent Yellow
- **Hex**: `#FFC50F`
- **RGB**: RGB(255, 197, 15)
- **Usage**: Secondary buttons, warnings, highlights, accent elements, hover states
- **Description**: A warm, golden yellow that complements the green without being harsh

### Rich Brown Text
- **Hex**: `#5B532C`
- **RGB**: RGB(91, 83, 44)
- **Usage**: Primary text, important labels, navigation elements
- **Description**: A deep brown that provides excellent contrast against lighter backgrounds

### Soft Cream Background
- **Hex**: `#FDE7B3`
- **RGB**: RGB(253, 231, 179)
- **Usage**: Subtle backgrounds, card backgrounds, section dividers
- **Description**: A warm cream that adds depth without overwhelming the green hero color

## Color Variants & Opacity Scales

### Green Variants
- `#63A361/10` - Very light green background
- `#63A361/20` - Light green background
- `#63A361/30` - Medium green background
- `#63A361/50` - Strong green background
- `#63A361` - Full strength (used for primary elements)

### Yellow Variants
- `#FFC50F/10` - Very light yellow background
- `#FFC50F/20` - Light yellow background
- `#FFC50F/30` - Medium yellow background
- `#FFC50F` - Full strength (used for accents)

### Brown Text Variants
- `#5B532C/60` - Subtle text
- `#5B532C/80` - Secondary text
- `#5B532C` - Full strength (primary text)

### Cream Background Variants
- `#FDE7B3/10` - Very light cream background
- `#FDE7B3/20` - Light cream background
- `#FDE7B3/30` - Medium cream background
- `#FDE7B3/50` - Strong cream background
- `#FDE7B3` - Full strength (used sparingly)

## Component Usage Patterns

### Cards & Containers
- **Main Background**: White (`#FFFFFF`)
- **Card Background**: `bg-[#FDE7B3]/10`
- **Border Color**: `border-[#5B532C]/20`
- **Hover State**: `hover:bg-[#FDE7B3]/30`

### Buttons & Interactive Elements
- **Primary Button**: `bg-[#63A361]` with `hover:bg-[#5B532C]`
- **Secondary Button**: `bg-[#FDE7B3]/30` with `hover:bg-[#FDE7B3]/50`
- **Text on Primary**: White (`#FFFFFF`)

### Text Colors
- **Headings**: `text-[#5B532C]`
- **Primary Content**: `text-gray-900` or `text-[#5B532C]`
- **Secondary Text**: `text-gray-600` or `text-[#5B532C]/80`
- **Success Indicators**: `text-[#63A361]`
- **Warning Indicators**: `text-[#FFC50F]`

### Status Indicators
- **Optimal/Safe**: `#63A361` (Green)
- **Warning**: `#FFC50F` (Yellow) 
- **Danger**: Red from Tailwind palette (when needed)

## Design Principles

1. **Green Dominance**: The `#63A361` green should be the primary, dominating color throughout the interface
2. **Matte Finish**: No gradients, shiny effects, or transparency that creates glossy finishes
3. **Subtle Contrasts**: Use the cream and brown for sophisticated, readable combinations
4. **Professional Look**: Maintain consistency to create a polished, trustworthy appearance
5. **Agricultural Connection**: Colors evoke nature and farming without being overly bright or cartoonish

## Accessibility Compliance
- All text colors maintain a minimum 4.5:1 contrast ratio against their backgrounds
- Color is never the sole means of conveying information
- High contrast options available for accessibility needs

## Application Examples

### Headers & Hero Sections
- Background: Use `bg-[#FDE7B3]/10` or white
- Text: Use `text-[#5B532C]`
- Primary elements: Use `#63A361`

### Navigation & Menus
- Background: White or `bg-[#FDE7B3]/10`
- Active states: `bg-[#FDE7B3]/30` with `text-[#63A361]`
- Hover states: `hover:bg-[#FDE7B3]/20`

### Cards & Content Areas
- Background: White with `border-[#5B532C]/20`
- Internal accents: Use `bg-[#FDE7B3]/10` for subtle highlights
- Important elements: Use `#63A361` for emphasis