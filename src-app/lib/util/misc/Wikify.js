/*
 * RetroWeb Browser
 * Copyright (C) 2020 Marcio Teixeira
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
 
 /**
 
 Heading 1
=========

Heading 2
---------

=== Heading 3 ===

; Some word
: Some definition

* List item 1
* List item 2

'''boldface'''
''italics''

* */

/* Removes embedded JSON content from the wiki markup. Since JSON content
 * may span multiple lines and can interfere with subsequent substitutions,
 * all JSON content is replaced with a marker and the JSON content is pushed
 * into the jsonStorage array.
 */
function un_json(str, jsonStorage) {
    str = str.replace( /^{\s*"[\w-]+"\s*:\s*(?:.|\n)+?^}/gm, function(m) {
        jsonStorage.push(m);
        return '{json_' + (jsonStorage.length-1) + '}';
    });
    return str;
}

/* Replaces the JSON markers with the contents of jsonStorage. The JSON will
 * be wrapped in a SCRIPT tag with type of "application/json"
 */
function re_json(str, jsonStorage) {
    str = str.replace( /\{json_([0-9]*)\}/gm, function(m,p) {
        return '<script type="application/json">\n' + jsonStorage[parseInt(p, 10)] + '\n</script>\n';
    });
    return str;
}

function lists(str) {
    function collapseSublist(str, delim, open_tag, close_tag) {
        var match_parent_li_and_sublist = new RegExp('(.*)\n((?:^' + delim + '.*$\n?)+)', "gm");
        var match_li                    = new RegExp('^' + delim + ' +(.*)$', "gm");
        return str.replace( match_parent_li_and_sublist,  (m,p_li,ol) => p_li + open_tag + ol.replace(match_li, '<li>$1</li>').replace(/\n/g,'') + close_tag + '\n');
    }
    str = collapseSublist(str, "[#][#][#]", "<ol>", "</ol>");
    str = collapseSublist(str, "[*][*][*]", "<ul>", "</ul>");
    str = collapseSublist(str, "[#][#]",    "<ol>", "</ol>");
    str = collapseSublist(str, "[*][*]",    "<ul>", "</ul>");
    str = collapseSublist(str, "[#]",       "<ol>", "</ol>");
    str = collapseSublist(str, "[*]",       "<ul>", "</ul>");
    return str;
}

function make_id(str) {
    return str.trim().replace(/ /g, "-").replace(/[^A-Za-z0-9\-]/g,'');
}

function make_anchor(str) {
    return '<a id="' + make_id(str) + '">' + str + '</a>';
}

// == Headers ==
function headers_sl(str) {
    return str.replace(/^(=+)[ ]*(.*)[ ]*\1/gm, function(a,b,c)
        {return '<h' + b.length + '>' + make_anchor(c) + '</h' + b.length + '>'});
}

// Headers
// -------
function headers_ml(str) {
    return str.replace(/^(\w.*)\n==+$/gm, (a,b) => '<h1>' + make_anchor(b) + '</h1>')
              .replace(/^(\w.*)\n--+$/gm, (a,b) => '<h2>' + make_anchor(b) + '</h2>');
}

function def_lists(str) {
    str = str.replace( /(?:^[;:].*$\n?)+/gm, '<dl>\n$&\n</dl>');
    str = str.replace( /^; (.*)$/gm, '<dt>$1</dt>');
    str = str.replace( /^: (.*)$/gm, '<dd>$1</dd>');
    return str;
}

function preformatted(str) {
    str = str.replace( /^([ ]{1,2}).*$(?:\n\1.*$)*/gm,
        function(m,w) {
            m = m.replace(RegExp('^'+w,'gm'),'');
            return (w == '  ') ? ('<blockquote>' + m + '</blockquote>')
                               : ('<pre>'        + m + '</pre>');
        }
    );
    return str;
}

function table_row(m,p) {
    var a = p.split('|');
    var modifierRegex = /^(!?)(&gt;|[\>^]?)(\d*)(,?\d*)(.*)$/;
    var s = "";
    for(i=0; i<a.length; i++) {
        var args = a[i].match(modifierRegex);
        var attr = "";
        if(args[2] == '^') {
            attr += ' class="align-center"';
        }
        if(args[2] == '>' || args[2] == '&gt;') {
            attr += ' class="align-right"';
        }
        if(args[3] != '') {
            attr += ' colspan="' + args[3] + '"';
        }
        if(args[4] != '') {
            attr += ' rowspan="' + args[4].substring(1) + '"';
        }
        if(args[1] == '!') {
            s += '<th' + attr + '>' + args[5] + '</th>';
        } else {
            s += '<td' + attr + '>' + args[5] + '</td>';
        }
    }
    return '<tr>' + s + '</tr>';
}

function tables(str) {
    str = str.replace( /(?:^[|].*$\n?)+/gm, '<table>\n$&</table>');
    str = str.replace( /^[|](.*)[|]$/gm, table_row);
    return str;
}

function formatting(str) {
    str = str.replace( /'''([^']+)'''/gm, '<strong>$1</strong>');
    str = str.replace( /''([^']+)''/gm, '<em>$1</em>');
    str = str.replace( /__([^_]+)__/gm, '<u>$1</u>');
    return str;
}

function figs(str) {
    // Figures and Images
    str = str.replace( /\[\[[Ff]igure-?([A-Za-z0-9-]*):([^ \]]+) ?(.*)\]\]/g,
        function(m, className, src, caption) {
            var attr = "";
            if(className != '') {
                attr = 'class="' + className + '" ';
            }
            if(caption != '') {
                return '<figure ' + attr + '><img src="' + src + '"><figcaption>' + caption + '</figcaption></figure>';
            } else {
                return '<figure ' + attr + '><img src="' + src + '"></figure>';
            }
        });
    str = str.replace( /\[\[[Ii]mage-?([A-Za-z0-9-]*):([^ \]]+)\]\]/g,
        function(m, className, src) {
            var attr = "";
            if(className != '') {
                attr = 'class="' + className + '" ';
            }
            return '<img ' + attr + 'src="' + src + '">';
        });
    return str;
}

function links(str) {
    // Internal links
    str = str.replace( /\[\[#([^\]|]+)\]\]/g, (a,b) => '<a href="#' + make_id(b) + '">' + b + '</a>');
    str = str.replace( /\[\[([^\]|]+)\]\]/g, '<a>$1</a>');
    str = str.replace( /\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<a href="$2">$1</a>');

    // Reference
    str = str.replace( /\[\d+\]/g, '<a class="reference">$&</a>');

    // External links
    str = str.replace( /\[(http[^\] ]+) ([^\]]+)\]/g,  '<a href="$1" target="new">$2</a>');
    str = str.replace( /\[(http[^\] ]+)\]/g,           '<a href="$1" target="new">$1</a>');
    str = str.replace( /([^">])(http[^\]<\n ]+)/g,      '$1<a href="$2" target="new">$2</a>');

    return str;
}

function paragraphs(str) {
    str = str.replace( /^(?:\w[^\n]+\n)+/gm, '<p>$&</p>');
    return str;
}

// Replaces CRLF or CR with LF
function crlf(str) {
    return str.replace(/\r\n/g,'\n')
              .replace(/\r/g,'\n');
}

// Wikifies the specified string. When a cssUrl is provided, a complete HTML document is returned
// with a link to the style sheet.
function wikify (str, attr) {
    var jsonStorage = [];
    let wikified = re_json(formatting(tables(links(figs(headers_sl(def_lists(preformatted(lists(lists(lists(lists(lists(paragraphs(headers_ml(un_json(crlf(str),jsonStorage))))))))))))))),jsonStorage);
    if(attr) {
        return '<html><head>' + wikiHead(attr) + '</head><body>' + wikified + '</body></html>';
    } else {
        return wikified;
    }
}

function wikiHead(attr) {
    let str = '<meta charset="utf-8">';
    if(attr.base) {
        str += '<base href="' + attr.base + '">';
    }
    if(attr.css) {
        str += '<link rel="stylesheet" href="' + attr.css + '">'
    }
    return str;
}

// onload event handler that wikifies a loaded document
function wikifyOnLoad(evt) {
    let doc = evt.target;
    let contents = doc.getElementsByTagName("PRE")[0].innerHTML;
    doc.getElementsByTagName("HEAD")[0].innerHTML = wikiHead({css: "css/markdown.css"});
    doc.body.innerHTML = wikify(contents);
}