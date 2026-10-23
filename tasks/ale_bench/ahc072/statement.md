You are a world-class algorithm engineer, and you are very good at programming. Now, you are participating in a programming contest. You are asked to solve a heuristic problem, known as an NP-hard problem.

Story
--------

Takahashi is the king of a colorful kingdom of slimes. As dusk approaches, he decides to send his companions, who have been playing here and there, back to their nests of matching colors.

The slimes have a special skill: the "somersault jump." They stack into towers and use the springiness of the slimes below them to jump. At their king's command, the upper part of a tower flips over and flies through the air. Upon landing on a nest, slimes of the matching color return home, starting from the top.

Takahashi would also like to return to his nest and rest. Help him find a sequence of jumps that sends all his companions home with as few commands as possible.
![An example of building towers and sending all five slimes home](https://img.atcoder.jp/ahc072/01243b315848982db7a2c11fa55861d5.gif)

Problem Statement
--------

There is an $N\times N$ grid. Let $(0,0)$ be the coordinates of the top-left cell, and let $(i,j)$ be the coordinates of the cell located $i$ cells downward and $j$ cells to the right from there. Each cell is either floor or a wall.

The grid contains slimes of $K$ colors, numbered $0,1,\ldots,K-1$. Slimes can stack vertically on floor cells to form towers. Slimes of different colors can share a tower, and they do not merge. The height of a tower is the number of slimes in it, with **a maximum of 8**. A cell with no slimes has height 0.

Initially, each cell contains at most one slime, and no slime is on a nest. There is one nest of each color, and each slime aims to return to the nest of its own color.

You can perform the following operation, called a "somersault jump," at most $100000$ times. Send all slimes home using as few operations as possible.

#### Somersault Jump

Choose a cell $(i,j)$ containing a tower of height $h>0$, and specify the number $k$ of slimes to leave behind, a direction $d$ (up, down, left, or right), and a jump distance $\ell$. Let $g$ be the height at the destination before the operation. All of the following conditions must hold.

- $k,\ell$ are integers, $0\leq k<h$, and $1\leq\ell\leq k+1$.
- The cells located 1, 2, ..., $\ell$ cells from $(i,j)$ in direction $d$ are all floor cells within the grid. **The jump may pass over intermediate towers.**
- **$g+(h-k)\leq8$. In other words, the tower height after landing must be at most 8. This is checked before any slimes return home, even if doing so reduces the height.**

The top $h-k$ slimes at the starting cell jump together, **reverse their vertical order**, and land on top of the tower at the destination. The order of the $k$ slimes left behind and that of the slimes originally at the destination remain unchanged. Then, the following return-home process takes place at **both the starting cell and the destination**.

#### Returning Home

At a cell with a nest of color $i$, repeatedly remove the top slime from the grid as long as it has color $i$. This is called returning home. If a different color is encountered, the slimes below it do not return home. Nothing happens at cells without a nest.

Slimes that have returned home never reappear on the grid. Returning home happens automatically and does not count as an operation.

#### Example of Returning Home

Suppose slimes are stacked in the order $(0,0,1)$ from bottom to top on the nest of color 0. With $k=2$, the top slime of color 1 jumps three cells to the right onto the nest of color 1, which has no slimes on it. The two slimes of color 0 at the starting cell and the slime of color 1 at the destination then return home. Assume that all intermediate cells are floor cells.

![The top slime jumps three cells, and slimes return home at both ends](https://img.atcoder.jp/ahc072/522fd2a8782ab8cdbcb00056f2fcbc23.gif)

Scoring
--------

Let $T$ be the number of operations and $E$ be the number of slimes remaining on the grid after all operations. Your absolute score is

\[ S=T+100000E \]

<font color="red">**The lower the absolute score, the better.**</font>

For each test case, we compute the <font color="red">**relative score**</font> $\mathrm{round}(10^9\times \frac{\mathrm{MIN}}{\mathrm{YOUR}})$, where YOUR is your absolute score and MIN is the lowest absolute score among all competitors obtained on that test case. The score of the submission is the sum of the relative scores.

The final ranking will be determined by the system test with more inputs which will be run after the contest is over. In both the provisional/system test, if your submission produces illegal output or exceeds the time limit for some test cases, only the score for those test cases will be zero, and your submission will be excluded from the MIN calculation for those test cases. The system test will be performed only for <font color="red">**the last submission which received a result other than <span class="label label-warning" data-toggle="tooltip" data-placement="top" title="Compilation Error">CE</span> **</font>. Be careful not to make a mistake in the final submission.

#### Number of test cases

- Provisional test: 50
- System test: 2000. We will publish <a href="https://img.atcoder.jp/ahc072/seeds.txt">seeds.txt</a> (sha256=67cf8463e118af25951c5e583a5b41607e58143174ac6aa6ca8477285fa70323) after the contest is over.

#### About relative evaluation system

In both the provisional/system test, the standings will be calculated using only the last submission which received a result other than <span class="label label-warning" data-toggle="tooltip" data-placement="top" title="Compilation Error">CE</span> . Only the last submissions are used to calculate the MIN for each test case when calculating the relative scores.

The scores shown in the standings are relative, and whenever a new submission arrives, all relative scores are recalculated. On the other hand, the score for each submission shown on the submissions page is the sum of the absolute score for each test case, and the relative scores are not shown. In order to know the relative score of submission other than the latest one in the current standings, you need to resubmit it. If your submission produces illegal output or exceeds the time limit for some test cases, the score shown on the submissions page will be 0, but the standings show the sum of the relative scores for the test cases that were answered correctly.

#### About execution time

Execution time may vary slightly from run to run. In addition, since system tests simultaneously perform a large number of executions, it has been observed that execution time increases by several percent compared to provisional tests. For these reasons, submissions that are very close to the time limit may result in <span class="label label-warning" data-toggle="tooltip" data-placement="top" title="Time Limit Exceeded">TLE</span> in the system test. Please measure the execution time in your program to terminate the process, or have enough margin in the execution time.

Input
--------

Input is given from Standard Input in the following format.

~~~
$N$ $K$
$C_0$
$\vdots$
$C_{N-1}$
~~~

- $12\leq N\leq20$, $4\leq K\leq12$.
- $C_i$ is a string of length $N$. Its $j$-th character represents the initial state of cell $(i,j)$ as follows.

  - `#`: a wall
  - `.`: a floor cell with neither a slime nor a nest
  - `a`–`l`: a floor cell with one slime of color 0–11, respectively
  - `A`–`L`: a floor cell with a nest of color 0–11, respectively

- There are at least $2K$ floor cells, and they are connected by vertical and horizontal adjacency.

- Only the first $K$ uppercase and lowercase letters are used. Each uppercase letter appears exactly once, and each lowercase letter appears at least once.

Output
--------

Output to Standard Output in the following format.

For the $t$-th operation, output the starting cell $(i_t,j_t)$, the number $k_t$ of slimes to leave behind, the direction $d_t$, and the jump distance $l_t$, with one operation per line for a total of $T$ lines.

~~~
$i_0$ $j_0$ $k_0$ $d_0$ $l_0$
$\vdots$
$i_{T-1}$ $j_{T-1}$ $k_{T-1}$ $d_{T-1}$ $l_{T-1}$
~~~

$d_t$ is one of the characters `U`, `D`, `L`, and `R`, corresponding to up, down, left, and right, respectively.

<a href="https://img.atcoder.jp/ahc072/BrsBAXF2.html?lang=en&amp;seed=0&amp;output=sample">Show example</a>

Input Generation
--------

The input for seed=0 is created manually and is not included in the provisional or system tests. All other inputs are generated as follows.

#### Generation Parameters

Generate $N$ and $K$ independently and uniformly at random from the integers between $12$ and $20$ inclusive and between $4$ and $12$ inclusive, respectively.

Generate the slime density $\rho$ and the wall proposal probability $\beta$ independently and uniformly at random from $[0.12,0.65)$ and $[0,0.40)$, respectively.

#### Terrain

Initially, all cells are floor cells. Arrange all cells in a uniformly random order.

In that order, independently attempt to turn each cell into a wall with probability $\beta$. Make the change only if at least $2K$ floor cells remain and the floor cells remain connected.

#### Nests and Initial Positions

Choose $K$ distinct floor cells uniformly at random, and place the nests of colors $0,\ldots,K-1$ in the order chosen.

Let $F$ be the number of floor cells without a nest, and let the total number of slimes be $M=\max(K,\mathrm{round}(\rho F))$. Choose $M$ distinct floor cells without a nest uniformly at random, and place one slime on each.

#### Assigning Colors

Independently choose $K-1$ integers uniformly at random from the integer interval $[0,M-K]$. The same value may be chosen more than once. Sort the chosen values in ascending order as $s_1,\ldots,s_{K-1}$, and set $s_0=0$ and $s_K=M-K$. For each color $i=0,\ldots,K-1$, the number of slimes is

\[ b_i=s_{i+1}-s_i+1 \]

Prepare $b_i$ copies of each color $i$, uniformly shuffle all $M$ colors, and assign them to the slimes at the initial positions.

Tools (Input generator and visualizer)
--------

- <a href="https://img.atcoder.jp/ahc072/BrsBAXF2.html?lang=en">Web version</a>: This is more powerful than the local version providing animations and manual play.
- <a href="https://img.atcoder.jp/ahc072/BrsBAXF2.zip">Local version</a>: You need a compilation environment of <a href="https://www.rust-lang.org/">Rust language</a>. If it does not compile, please try `rustup update`.

  - <a href="https://img.atcoder.jp/ahc072/BrsBAXF2_windows.zip">Pre-compiled binary for Windows</a>: If you are not familiar with the Rust language environment, please use this instead.

During the contest, you may share only images or videos produced by the visualizer for the seed=0 input and the corresponding scores on X. Use the hashtags #AHC072 and #visualizer and a public account. Sharing output text, visualization results or scores for other inputs, or discussing solutions or ideas is prohibited.

<a href="https://x.com/search?q=%23AHC072%20%23visualizer&amp;f=live">List of shared images</a>

Use of Generative AI
--------

Under the current <a href="https://info.atcoder.jp/entry/ahc-llm-rules-en">AtCoder Heuristic Contest Generative AI Usage Rules — Version 20250616</a>, it is prohibited to have an AI agent execute a solution program and automatically repeat improvements based on the execution results.

However, with the latest generative AI systems, the distinction between conversational services such as ChatGPT and AI agents such as Codex has become increasingly blurred. Even conversational services may, without an explicit instruction from the user, internally generate test cases, execute a solution program, and automatically repeat improvements based on the execution results.

Some participants already explicitly instruct generative AI systems not to engage in such behavior. To ensure fairness among participants and to enforce the intent of the current rules, anyone using generative AI in this contest must provide the instruction below either at the beginning of each chat or through a custom instruction, project instruction, or instruction file automatically loaded by the relevant generative AI tool, such as `AGENTS.md` or `CLAUDE.md`.

~~~
I am currently participating in an AtCoder Heuristic Contest, and I will use this generative AI to assist in developing my solution.

When using this generative AI, the "AtCoder Heuristic Contest Generative AI Usage Rules - Version 20250616" apply.

https://info.atcoder.jp/entry/ahc-llm-rules-en

Most importantly, after running the solution program, you must not modify or improve the solution, its approach, or its code based on the execution results unless the user gives a new explicit instruction to do so.

You may run the solution program and report its execution results, logs, scores, or other observations. After reporting them, you must stop and wait for a new instruction from the user before making any improvement based on those results.

Here, "solution program" refers to any program created or being created for the purpose of solving this contest problem, regardless of whether it was created by the user or by generative AI, and regardless of whether it is still in progress or already complete.
~~~

Problem constraints:
time_limit=2.0 memory_limit=1073741824
