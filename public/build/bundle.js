
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.3' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var nodes = [
    	{
    		id: "doom",
    		x: 500,
    		y: 50,
    		title: "DOOM",
    		img: "testpic.png",
    		date: "1993",
    		description: "this is the first!",
    		hrefs: [
    			{
    				title: "DoomWiki",
    				url: "https://doomwiki.org/wiki/Versions_of_Doom_and_Doom_II#v1.2"
    			}
    		]
    	},
    	{
    		id: "heretic",
    		x: 200,
    		y: 200,
    		title: "Heretic",
    		img: "testpic.png",
    		date: "1993",
    		parentVersion: "DOOM v1.2",
    		description: "it's alright",
    		hrefs: [
    			{
    				title: "DoomWiki",
    				url: "https://doomwiki.org/wiki/Heretic"
    			}
    		]
    	},
    	{
    		id: "doom2",
    		x: 500,
    		y: 200,
    		title: "DOOM II",
    		img: "testpic.png",
    		date: "1994",
    		description: "it's got another shotgun",
    		hrefs: [
    			{
    				title: "DoomWiki",
    				url: "https://doomwiki.org/wiki/Versions_of_Doom_and_Doom_II#v1.666"
    			}
    		]
    	},
    	{
    		id: "jaguar",
    		x: 800,
    		y: 200,
    		title: "DOOM (Jaguar)",
    		img: "testpic.png",
    		date: "1993",
    		parentVersion: "DOOM v1.2",
    		description: "it's not good",
    		hrefs: [
    			{
    				title: "DoomWiki",
    				url: "https://doomwiki.org/wiki/Atari_Jaguar"
    			}
    		]
    	}
    ];
    var edges = [
    	{
    		from: "doom",
    		to: "heretic"
    	},
    	{
    		from: "doom",
    		to: "doom2"
    	},
    	{
    		from: "doom",
    		to: "jaguar"
    	}
    ];
    var graph = {
    	nodes: nodes,
    	edges: edges
    };

    /* src/App.svelte generated by Svelte v3.44.3 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	child_ctx[21] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    // (112:3) {#each getChildren(node.id) as link}
    function create_each_block_4(ctx) {
    	let path;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "d", "M" + /*node*/ ctx[19].x + " " + /*node*/ ctx[19].y + " v" + (/*link*/ ctx[22].y - /*node*/ ctx[19].y) / 2 + " H" + /*link*/ ctx[22].x + " V" + /*link*/ ctx[22].y);
    			attr_dev(path, "class", "svelte-19m0gn1");
    			add_location(path, file, 112, 4, 1858);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(112:3) {#each getChildren(node.id) as link}",
    		ctx
    	});

    	return block;
    }

    // (110:1) {#each graph.nodes as node, i}
    function create_each_block_3(ctx) {
    	let g1;
    	let g0;
    	let rect;
    	let text_1;
    	let t_value = /*node*/ ctx[19].title + "";
    	let t;
    	let mounted;
    	let dispose;
    	let each_value_4 = /*getChildren*/ ctx[5](/*node*/ ctx[19].id);
    	validate_each_argument(each_value_4);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[6](/*node*/ ctx[19], ...args);
    	}

    	const block = {
    		c: function create() {
    			g1 = svg_element("g");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			g0 = svg_element("g");
    			rect = svg_element("rect");
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr_dev(rect, "x", 0);
    			attr_dev(rect, "y", 0);
    			attr_dev(rect, "width", /*nodeWidth*/ ctx[1]);
    			attr_dev(rect, "height", /*nodeHeight*/ ctx[2]);
    			attr_dev(rect, "class", "svelte-19m0gn1");
    			add_location(rect, file, 115, 4, 2081);
    			attr_dev(text_1, "x", 10);
    			attr_dev(text_1, "y", 30);
    			attr_dev(text_1, "class", "svelte-19m0gn1");
    			add_location(text_1, file, 116, 4, 2144);
    			attr_dev(g0, "class", "node svelte-19m0gn1");
    			attr_dev(g0, "transform", "translate(" + (/*node*/ ctx[19].x - /*nodeWidth*/ ctx[1] / 2) + "," + (/*node*/ ctx[19].y - /*nodeHeight*/ ctx[2] / 2) + ")");
    			add_location(g0, file, 114, 3, 1946);
    			attr_dev(g1, "class", "node-container svelte-19m0gn1");
    			add_location(g1, file, 110, 2, 1785);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(g1, null);
    			}

    			append_dev(g1, g0);
    			append_dev(g0, rect);
    			append_dev(g0, text_1);
    			append_dev(text_1, t);

    			if (!mounted) {
    				dispose = listen_dev(g0, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*graph, getChildren*/ 32) {
    				each_value_4 = /*getChildren*/ ctx[5](/*node*/ ctx[19].id);
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(g1, g0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_4.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(110:1) {#each graph.nodes as node, i}",
    		ctx
    	});

    	return block;
    }

    // (123:0) {#if selected}
    function create_if_block(ctx) {
    	let div;
    	let header;
    	let button;
    	let t1;
    	let h1;
    	let t2_value = /*selected*/ ctx[0].title + "";
    	let t2;
    	let t3;
    	let p0;
    	let t4_value = /*selected*/ ctx[0].date + "";
    	let t4;
    	let t5;
    	let article;
    	let t6;
    	let p1;
    	let t7_value = /*selected*/ ctx[0].description + "";
    	let t7;
    	let t8;
    	let t9;
    	let t10;
    	let mounted;
    	let dispose;
    	let if_block0 = /*selected*/ ctx[0].parentVersion && create_if_block_4(ctx);
    	let if_block1 = /*selected*/ ctx[0].hrefs && create_if_block_3(ctx);
    	let if_block2 = /*selected*/ ctx[0].children.length && create_if_block_2(ctx);
    	let if_block3 = /*selected*/ ctx[0].parents.length && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			header = element("header");
    			button = element("button");
    			button.textContent = "x";
    			t1 = space();
    			h1 = element("h1");
    			t2 = text(t2_value);
    			t3 = space();
    			p0 = element("p");
    			t4 = text(t4_value);
    			t5 = space();
    			article = element("article");
    			if (if_block0) if_block0.c();
    			t6 = space();
    			p1 = element("p");
    			t7 = text(t7_value);
    			t8 = space();
    			if (if_block1) if_block1.c();
    			t9 = space();
    			if (if_block2) if_block2.c();
    			t10 = space();
    			if (if_block3) if_block3.c();
    			attr_dev(button, "class", "svelte-19m0gn1");
    			add_location(button, file, 125, 3, 2385);
    			attr_dev(h1, "class", "svelte-19m0gn1");
    			add_location(h1, file, 126, 3, 2428);
    			attr_dev(p0, "class", "svelte-19m0gn1");
    			add_location(p0, file, 127, 3, 2457);
    			set_style(header, "background-image", "linear-gradient(to top, rgba(20, 20, 20, 1) 25%, rgba(20, 20, 20, 0)), url('" + /*selected*/ ctx[0].img + "')");
    			attr_dev(header, "class", "svelte-19m0gn1");
    			add_location(header, file, 124, 2, 2254);
    			attr_dev(p1, "class", "svelte-19m0gn1");
    			add_location(p1, file, 131, 3, 2584);
    			attr_dev(article, "class", "svelte-19m0gn1");
    			add_location(article, file, 129, 2, 2494);
    			attr_dev(div, "class", "info svelte-19m0gn1");
    			add_location(div, file, 123, 1, 2232);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, header);
    			append_dev(header, button);
    			append_dev(header, t1);
    			append_dev(header, h1);
    			append_dev(h1, t2);
    			append_dev(header, t3);
    			append_dev(header, p0);
    			append_dev(p0, t4);
    			append_dev(div, t5);
    			append_dev(div, article);
    			if (if_block0) if_block0.m(article, null);
    			append_dev(article, t6);
    			append_dev(article, p1);
    			append_dev(p1, t7);
    			append_dev(article, t8);
    			if (if_block1) if_block1.m(article, null);
    			append_dev(article, t9);
    			if (if_block2) if_block2.m(article, null);
    			append_dev(article, t10);
    			if (if_block3) if_block3.m(article, null);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*clearNode*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selected*/ 1 && t2_value !== (t2_value = /*selected*/ ctx[0].title + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*selected*/ 1 && t4_value !== (t4_value = /*selected*/ ctx[0].date + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*selected*/ 1) {
    				set_style(header, "background-image", "linear-gradient(to top, rgba(20, 20, 20, 1) 25%, rgba(20, 20, 20, 0)), url('" + /*selected*/ ctx[0].img + "')");
    			}

    			if (/*selected*/ ctx[0].parentVersion) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(article, t6);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*selected*/ 1 && t7_value !== (t7_value = /*selected*/ ctx[0].description + "")) set_data_dev(t7, t7_value);

    			if (/*selected*/ ctx[0].hrefs) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(article, t9);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*selected*/ ctx[0].children.length) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_2(ctx);
    					if_block2.c();
    					if_block2.m(article, t10);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*selected*/ ctx[0].parents.length) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_1(ctx);
    					if_block3.c();
    					if_block3.m(article, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(123:0) {#if selected}",
    		ctx
    	});

    	return block;
    }

    // (131:3) {#if selected.parentVersion}
    function create_if_block_4(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*selected*/ ctx[0].parentVersion + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Based on ");
    			t1 = text(t1_value);
    			attr_dev(p, "class", "svelte-19m0gn1");
    			add_location(p, file, 130, 31, 2535);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selected*/ 1 && t1_value !== (t1_value = /*selected*/ ctx[0].parentVersion + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(131:3) {#if selected.parentVersion}",
    		ctx
    	});

    	return block;
    }

    // (133:3) {#if selected.hrefs}
    function create_if_block_3(ctx) {
    	let t;
    	let ul;
    	let each_value_2 = /*selected*/ ctx[0].hrefs;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			t = text("External links:\n\t\t\t\t");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(ul, file, 134, 4, 2662);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selected*/ 1) {
    				each_value_2 = /*selected*/ ctx[0].hrefs;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(133:3) {#if selected.hrefs}",
    		ctx
    	});

    	return block;
    }

    // (136:5) {#each selected.hrefs as href}
    function create_each_block_2(ctx) {
    	let li;
    	let a;
    	let t_value = /*href*/ ctx[16].title + "";
    	let t;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", a_href_value = /*href*/ ctx[16].url);
    			add_location(a, file, 136, 10, 2713);
    			add_location(li, file, 136, 6, 2709);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selected*/ 1 && t_value !== (t_value = /*href*/ ctx[16].title + "")) set_data_dev(t, t_value);

    			if (dirty & /*selected*/ 1 && a_href_value !== (a_href_value = /*href*/ ctx[16].url)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(136:5) {#each selected.hrefs as href}",
    		ctx
    	});

    	return block;
    }

    // (142:3) {#if selected.children.length}
    function create_if_block_2(ctx) {
    	let t;
    	let ul;
    	let each_value_1 = /*selected*/ ctx[0].children;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			t = text("Ports based on this:\n\t\t\t\t");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(ul, file, 143, 4, 2866);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selected*/ 1) {
    				each_value_1 = /*selected*/ ctx[0].children;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(142:3) {#if selected.children.length}",
    		ctx
    	});

    	return block;
    }

    // (145:5) {#each selected.children as child}
    function create_each_block_1(ctx) {
    	let li;
    	let a;
    	let t_value = /*child*/ ctx[13].title + "";
    	let t;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "href", a_href_value = '#' + /*child*/ ctx[13].id);
    			add_location(a, file, 145, 10, 2921);
    			add_location(li, file, 145, 6, 2917);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selected*/ 1 && t_value !== (t_value = /*child*/ ctx[13].title + "")) set_data_dev(t, t_value);

    			if (dirty & /*selected*/ 1 && a_href_value !== (a_href_value = '#' + /*child*/ ctx[13].id)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(145:5) {#each selected.children as child}",
    		ctx
    	});

    	return block;
    }

    // (151:3) {#if selected.parents.length}
    function create_if_block_1(ctx) {
    	let t;
    	let ul;
    	let each_value = /*selected*/ ctx[0].parents;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			t = text("Port based on:\n\t\t\t\t");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(ul, file, 152, 4, 3058);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selected*/ 1) {
    				each_value = /*selected*/ ctx[0].parents;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(151:3) {#if selected.parents.length}",
    		ctx
    	});

    	return block;
    }

    // (154:5) {#each selected.parents as parent}
    function create_each_block(ctx) {
    	let li;
    	let a;
    	let t_value = /*parent*/ ctx[10].title + "";
    	let t;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "href", a_href_value = '#' + /*parent*/ ctx[10].id);
    			add_location(a, file, 154, 10, 3113);
    			add_location(li, file, 154, 6, 3109);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selected*/ 1 && t_value !== (t_value = /*parent*/ ctx[10].title + "")) set_data_dev(t, t_value);

    			if (dirty & /*selected*/ 1 && a_href_value !== (a_href_value = '#' + /*parent*/ ctx[10].id)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(154:5) {#each selected.parents as parent}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let svg;
    	let t;
    	let if_block_anchor;
    	let mounted;
    	let dispose;
    	let each_value_3 = graph.nodes;
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let if_block = /*selected*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(svg, "width", "4000");
    			attr_dev(svg, "height", "1100");
    			attr_dev(svg, "viewBox", "0 0 4000 1100");
    			attr_dev(svg, "class", "svelte-19m0gn1");
    			add_location(svg, file, 108, 0, 1694);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg, null);
    			}

    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = listen_dev(window, "hashchange", /*hashChange*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*graph, nodeWidth, nodeHeight, location, getChildren*/ 38) {
    				each_value_3 = graph.nodes;
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(svg, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}

    			if (/*selected*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let nodeWidth = 250;
    	let nodeHeight = 50;
    	let selected = null;

    	function hashChange() {
    		selectNode(location.hash.substring(1));
    	}

    	function selectNode(node) {
    		if (typeof node == 'string') {
    			$$invalidate(0, selected = getNode(node));
    		} else {
    			$$invalidate(0, selected = node);
    		}

    		$$invalidate(0, selected.parents = getParents(selected.id), selected);
    		$$invalidate(0, selected.children = getChildren(selected.id), selected);
    	}

    	function clearNode() {
    		$$invalidate(0, selected = null);
    	}

    	function getParents(id) {
    		return graph.edges.filter(link => link.to == id).map(link => getNode(link.from));
    	}

    	function getChildren(id) {
    		return graph.edges.filter(link => link.from == id).map(link => getNode(link.to));
    	}

    	function getNode(id) {
    		return graph.nodes.find(node => node.id == id);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = (node, e) => location.hash = node.id;

    	$$self.$capture_state = () => ({
    		graph,
    		nodeWidth,
    		nodeHeight,
    		selected,
    		hashChange,
    		selectNode,
    		clearNode,
    		getParents,
    		getChildren,
    		getNode
    	});

    	$$self.$inject_state = $$props => {
    		if ('nodeWidth' in $$props) $$invalidate(1, nodeWidth = $$props.nodeWidth);
    		if ('nodeHeight' in $$props) $$invalidate(2, nodeHeight = $$props.nodeHeight);
    		if ('selected' in $$props) $$invalidate(0, selected = $$props.selected);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		selected,
    		nodeWidth,
    		nodeHeight,
    		hashChange,
    		clearNode,
    		getChildren,
    		click_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
