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
Shows summary statistics, by project, by file, or by function.
- ##### Proof Obligations by type of discharge
- ##### Proof Obligations by file
- ##### Proof Obligations by function
    Lists top 20 function with the lagest number of associated proof obligations.
- ##### Functions by control flow graph complexity. 
    This chart shows top 10 of the most control-flow-complex functions.
- etc..

![Summary](/docs/summary.png)
![Summary](/docs/summary%20by%20function.png)



### Source Code View
Shows C source code read-only, with analysis results applied. 
Each line of code is marked with a number of associated proof obligations. 
![Source code view](/docs/source.png)

When line is selected, the list of associated roof obligations is expanded.
![Source code view](/docs/source%20line%20selected.png)



### Proof Obligations List
TODO:
Listing proof obligation by file/function in correspondence with the applied filter.
### Assumptions List
TODO:
### Assumptions Graph.
The graph shows proof obligations, assumptions and relationship beween them. 
Each node represents either a proof obligation, assumption, or a group. Nodes are groupped by file / function / predicate. 

You can expand a group either by double clicking, or by clicking the "plus" top-right button.

Orphan nodes are hidden. 


![Assumptions graph](/docs/graph.png)
![Selected graph node](/docs/graph%20selection.png)




# Contributing.
## Building the project.
1. Install node.js, for details see  https://nodejs.org/en/download/
2. $ `git clone https://github.com/kestreltechnology/electron-kt-advance.git`
3. $ `cd electron-kt-advance`
4. $ `npm install`

TODO:
