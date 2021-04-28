/**
 * WebSlicer
 * Copyright (C) 2016  Marcio Teixeira
 * Copyright (C) 2020  SynDaver Labs, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/* Decode a CSS color
 */
function parseColor(color) {
    var m = color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if(m) {
        return [parseInt(m[1], 10), parseInt(m[2],10), parseInt(m[3], 10), 255];
    }

    m = color.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*((0.)?\d+)\s*\)$/i);
    if(m) {
        return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), parseInt(m[4], 10)];
    }
}

function getStylePropertyFromElement(selector, property) {
    const el = document.querySelector(selector);
    const style = window.getComputedStyle(el);
    return style.getPropertyValue(property);
}

function getColorArrayFromElement(selector, property) {
    return parseColor(getStylePropertyFromElement(selector,property));
}

function getColorValueFromElement(selector, property) {
    const rgb = getColorArrayFromElement(selector, property);
    return (rgb[0] << 16) + (rgb[1] << 8) + rgb[2];
}

function getColorFloatArrayFromElement(selector, property) {
    return getColorArrayFromElement(selector, property).map(x => x/255);
}

function rgbToHsl(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return {h, s, l};
}

function formatHexColor(r,g,b) {
  let rs = r.toString(16),
      gs = g.toString(16),
      bs = b.toString(16);

  if (rs.length == 1)
    rs = "0" + rs;
  if (gs.length == 1)
    gs = "0" + gs;
  if (bs.length == 1)
    bs = "0" + bs;

  return "#" + rs + gs + bs;
}

function parseHexColor(h) {
  let r = 0, g = 0, b = 0;

  // 3 digits
  if (h.length == 4) {
    r = parseInt(h[1] + h[1], 16);
    g = parseInt(h[2] + h[2], 16);
    b = parseInt(h[3] + h[3], 16);

  // 6 digits
  } else if (h.length == 7) {
    r = parseInt(h[1] + h[2], 16);
    g = parseInt(h[3] + h[4], 16);
    b = parseInt(h[5] + h[6], 16);
  }

  return {r, g, b};
}