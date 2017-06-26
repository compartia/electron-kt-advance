# GUI for KT Advance  Memory Safety Analyzer for C

[![Build Status](https://travis-ci.org/kestreltechnology/electron-kt-advance.svg?branch=master)](https://travis-ci.org/kestreltechnology/electron-kt-advance)


- [General UI components](#general-ui-components)
  - [Opening a project](#opening-a-project)
  - [Filtering proof obligations](#filtering-proof-obligations)
  - [Tabs](#tabs)
    - [Summary](#summary)
    - [Source code view](#source-code-view)
    - [Proof obligations list](#proof-obligations-list)
    - [Assumptions list](#assumptions-list)
    - [Assumptions Graph.](#assumptions-graph)
- [Contributing.](#contributing)
  - [Building the project.](#building-the-project)

# General UI components
## Opening a project
TODO:

## Filtering proof obligations
![Summary](/docs/filter.png)


## Tabs
### Summary
Shows project statistics charts.
- ##### Proof Obligations by type of discharge
- ##### Proof Obligations by file
- ##### Proof Obligations by function
    lists top 20 function with the lagest number of associated proof obligations.
- ##### Functions by control flow graph complexity. 
    This chart shows top 10 of most complex functions.
- etc..



![Summary](/docs/summary.png)
### Source code view
This section allows you to see proof obligations right in the C source code. Each line of the code is marked with a number of associated proof obligations. 

![Source code view](/docs/source.png)

### Proof obligations list
TODO:
### Assumptions list
TODO:
### Assumptions Graph.
The grpah shows Proof Obligations, assumptions and relationship beween them. Each graph nore represents either a proof obligation, or assumption or a group. The nodes are groupped by file/function/predicate. You my open a group either by double clicking it or by clicking the "plus" top-right button.
Proof obligat
When node is
![Assumptions graph](/docs/graph.png)
![Selected graph node](/docs/graph%20selection.png)




# Contributing.
## Building the project.
1. Install node.js if you dont have it installed yet. https://nodejs.org/en/download/
2. $ `git clone https://github.com/kestreltechnology/electron-kt-advance.git`
3. $ `cd electron-kt-advance`
4. $ `npm install`
5. TODO:
