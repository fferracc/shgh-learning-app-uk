/*
 * Safe HTML for the UK app (25 Sep 2026, made strict 2 Oct 2026).
 * The app builds its screens from text typed by people (names, notes, course
 * descriptions, chat messages). Every HTML string that goes on screen through
 * innerHTML or insertAdjacentHTML is cleaned by DOMPurify first: layout, classes,
 * data-* attributes, forms and images stay; scripts and event handlers go.
 *
 * 2 Oct 2026: the app no longer uses a single inline handler (onclick="..."), so
 * ALL of them are removed. The old whitelist only checked how a handler STARTED,
 * so onclick="goBack();anything()" got through. Form "action" attributes are
 * removed too (the app never posts a form anywhere), so a message cannot carry a
 * fake sign-in form that sends a password to another site. Text typed by people
 * is also escaped by the app itself (escHtml) before it reaches this layer.
 * Needs vendor/purify.min.js loaded before this file.
 */
(function () {
    if (typeof window === 'undefined' || !window.DOMPurify || !Element.prototype) return;
    var purify = window.DOMPurify;

    purify.addHook('uponSanitizeAttribute', function (node, data) {
        var name = (data.attrName || '').toLowerCase();
        if (name.indexOf('on') === 0) { data.keepAttr = false; return; }
        if (name === 'action' || name === 'formaction') { data.keepAttr = false; return; }
        // Links may only go to web pages, mail, phone or WhatsApp; never javascript: or data:.
        if ((name === 'href' || name === 'src') && /^\s*(javascript|vbscript|data:text)/i.test(data.attrValue || '')) {
            data.keepAttr = false;
        }
    });

    var CONFIG = {
        ADD_ATTR: ['target'],
        SANITIZE_DOM: false,          // keep form fields called "name", "action" and so on
        ALLOW_DATA_ATTR: true,
        WHOLE_DOCUMENT: false
    };
    var busy = false;
    // Table parts only parse inside a table, so they are cleaned in their real context.
    var WRAP = {
        TBODY: ['<table><tbody>', '</tbody></table>'], THEAD: ['<table><thead>', '</thead></table>'],
        TFOOT: ['<table><tfoot>', '</tfoot></table>'], TR: ['<table><tbody><tr>', '</tr></tbody></table>'],
        TABLE: ['<table>', '</table>'], COLGROUP: ['<table><colgroup>', '</colgroup></table>']
    };
    function clean(html, el) {
        if (typeof html !== 'string' || html.indexOf('<') === -1) return html;
        var w = el && WRAP[el.tagName];
        if (!w) return purify.sanitize(html, CONFIG);
        var out = purify.sanitize(w[0] + html + w[1], CONFIG);
        var open = w[0].replace(/<table>/, ''), close = w[1].replace(/<\/table>$/, '');
        var start = out.indexOf(open ? open : '<table>') + (open ? open.length : '<table>'.length);
        var end = close ? out.lastIndexOf(close) : out.lastIndexOf('</table>');
        return (start >= 0 && end >= start) ? out.slice(start, end) : '';
    }

    var desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (desc && desc.set) {
        Object.defineProperty(Element.prototype, 'innerHTML', {
            configurable: true,
            enumerable: desc.enumerable,
            get: function () { return desc.get.call(this); },
            set: function (v) {
                if (busy || this.tagName === 'SCRIPT' || this.tagName === 'STYLE') return desc.set.call(this, v);
                busy = true;
                try { desc.set.call(this, clean(v, this)); } finally { busy = false; }
            }
        });
    }
    var odesc = Object.getOwnPropertyDescriptor(Element.prototype, 'outerHTML');
    if (odesc && odesc.set) {
        Object.defineProperty(Element.prototype, 'outerHTML', {
            configurable: true,
            enumerable: odesc.enumerable,
            get: function () { return odesc.get.call(this); },
            set: function (v) {
                if (busy) return odesc.set.call(this, v);
                busy = true;
                try { odesc.set.call(this, clean(String(v), this.parentElement)); } finally { busy = false; }
            }
        });
    }
    var insert = Element.prototype.insertAdjacentHTML;
    Element.prototype.insertAdjacentHTML = function (pos, v) {
        if (busy) return insert.call(this, pos, v);
        busy = true;
        var ctx = (pos === 'beforebegin' || pos === 'afterend') ? this.parentElement : this;
        try { return insert.call(this, pos, clean(String(v), ctx)); } finally { busy = false; }
    };
    window.__safeHtml = { clean: clean };
})();
