<script>
  import { onMount } from 'svelte';
  import graph from './nodes.json';

  let nodeWidth = 250;
  let nodeHeight = 50;
  let selected = undefined;

  onMount(() => {
    hashChange();

    for (let node of graph.nodes) {
      node.parents = getParents(node.id);
      node.children = getChildren(node.id);
      node.recursiveParents = getParentsRecursive(node.id).map(n => n.id);
    }

    console.log(graph);
  });

  function hashChange() {
    if (location.hash.length <= 1) {
      clearNode();
    }

    selectNode(location.hash.substring(1));
  }

  function selectNode(node) {
    if (typeof node == 'string') {
      selected = getNode(node);
    }
    else {
      selected = node;
    }

    if (!selected) {
      selected = undefined;
      return;
    }
  }

  function clearNode() {
    selected = null;
    location.hash = '';
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

  function getParentsRecursive(id) {
    const node = getNode(id);
    let parents = [];

    if (!node) {
      return parents;
    }

    for (let parent of getParents(id)) {
      parents.push(parent);
      parents = parents.concat(getParentsRecursive(parent.id));
    }

    return parents;
  }

  function isNodeActive(id) {
    if (!selected) {
      return true;
    }

    return selected.recursiveParents.includes(id) || id == selected.id
  }
</script>

<style type="text/css">
  svg {
    background-color: transparent;
  }

  h1 {
    padding: 0;
    margin: 0;
  }

  .info {
    position: fixed;
    right: 0;
    top: 0;
    width: 30em;
    height: 100%;
    margin: 0;
    background-color: rgba(20, 20, 20, 1);
    border: 1px solid black;
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

  .node-container path.inactive {
    opacity: 0;
  }

  .node {
    cursor: pointer;
  }

  .node.inactive {
    opacity: 0.2;
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

<svg width="4000" height="1100" viewBox="0 0 4000 1100" on:click={clearNode}>
  {#each graph.nodes as node, i}
    <g class = "node-container">
      {#each getChildren(node.id) as link}
        <path class={isNodeActive(link.id) ? 'active' : selected ? 'inactive' : 'normal'} d="M{node.x} {node.y} v{(link.y - node.y)/2} H{link.x} V{link.y}"/>
      {/each}
      <g class="node {isNodeActive(node.id) ? 'active' : selected ? 'inactive' : 'normal'}" on:click|stopPropagation={e => location.hash = node.id} transform="translate({node.x - (nodeWidth/2)},{node.y - (nodeHeight/2)})">
        <rect x={0} y={0} width={nodeWidth} height={nodeHeight} />
        <text x={10} y={30}>{node.title}</text>
      </g>
    </g>
  {/each}
</svg>

{#if selected}
  <div class="info"> 
    <header style="background-image: linear-gradient(to top, rgba(20, 20, 20, 1) 25%, rgba(20, 20, 20, 0)), url('{selected.img}')">
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

      {#if selected.parents.length}
        Port based on:
        <ul>
          {#each selected.parents as parent}
            <li><a href={'#' + parent.id}>{parent.title}</a></li>
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
    </article>
  </div>
{/if}