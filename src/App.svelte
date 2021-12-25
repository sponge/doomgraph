<script>
	import { onMount } from 'svelte';
	import graph from './nodes.json';

	let nodeWidth = 250;
	let nodeHeight = 50;
	let selected = null;

	onMount(() => {
		hashChange();
	});

	function hashChange() {
		selectNode(location.hash.substring(1));
	}

	function selectNode(node) {
		if (typeof node == 'string') {
			selected = getNode(node);
		}
		else {
			selected = node;
		}

		selected.parents = getParents(selected.id);
		selected.children = getChildren(selected.id);
	}

	function clearNode() {
		selected = null;
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
</script>

<style type="text/css">
	svg {
		background-color: transparent;
	}

	h1, h2, h3, h4, h5, h6 {
		padding: 0;
		margin: 0;
	}

	.info {
		box-sizing: border-box;
		position: fixed;
		right: 1em;
		top: 1em;
		width: 30em;
		height: 100%;
		background-color: rgba(20, 20, 20, 1);
		border: 1px solid black;
	}

	.info button {
		position: absolute;
		top: 0;
		right: 0;
	}

	.info header {
		height: 200px;
		padding-left: 1em;
		background-size: cover, cover;
		background-position: center, center;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}

	.info header p {
		margin: 0.5em 0;
	}

	.info article {
		padding: 1em;
	}

	.node-container path {
		fill: none;
		stroke: #555;
		stroke-width: 2pt;
	}

	.node {
		cursor: pointer;
	}

	.node text {
		fill: white;
	}

	.node rect {
		stroke-width: 1;
		stroke: #555;
		fill: #333;
	}
</style>

<svelte:window on:hashchange={hashChange} />

<svg width="4000" height="1100" viewBox="0 0 4000 1100">
	{#each graph.nodes as node, i}
		<g class = "node-container">
			{#each getChildren(node.id) as link}
				<path d="M{node.x} {node.y} v{(link.y - node.y)/2} H{link.x} V{link.y}"/>
			{/each}
			<g class="node" on:click={e => location.hash = node.id} transform="translate({node.x - (nodeWidth/2)},{node.y - (nodeHeight/2)})">
				<rect x={0} y={0} width={nodeWidth} height={nodeHeight} />
				<text x={10} y={30}>{node.title}</text>
			</g>
		</g>
	{/each}
</svg>

{#if selected}
	<div class="info"> 
		<header style="background-image: linear-gradient(to top, rgba(20, 20, 20, 1) 25%, rgba(20, 20, 20, 0)), url('{selected.img}')">
			<button on:click={clearNode}>x</button>
			<h1>{selected.title}</h1>
			<p>{selected.date}</p>
		</header>
		<article>
			{#if selected.parentVersion}<p>Based on {selected.parentVersion}</p>{/if}
			<p>{selected.description}</p>
			{#if selected.hrefs}
				External links:
				<ul>
					{#each selected.hrefs as href}
						<li><a target="_blank" href={href.url}>{href.title}</a></li>
					{/each}
				</ul>
			{/if}

			{#if selected.children.length}
				Ports based on this:
				<ul>
					{#each selected.children as child}
						<li><a href={'#' + child.id}>{child.title}</a></li>
					{/each}
				</ul>
			{/if}

			{#if selected.parents.length}
				Port based on:
				<ul>
					{#each selected.parents as parent}
						<li><a href={'#' + parent.id}>{parent.title}</a></li>
					{/each}
				</ul>
			{/if}
		</article>
	</div>
{/if}