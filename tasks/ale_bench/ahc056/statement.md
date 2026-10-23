You are a world-class algorithm engineer, and you are very good at programming. Now, you are participating in a programming contest. You are asked to solve a heuristic problem, known as an NP-hard problem.

Story
--------

A <a href="https://en.wikipedia.org/wiki/Turing_machine">Turing machine</a> is a theoretical computing machine used in computational theory. It performs computations by following **transition rules**, changing its **internal state** (the value stored in the machine's memory) and the **symbol at the head position** on a one-dimensional tape, while moving the head left or right.

F Corporation is developing a robot modeled after this mechanism. This robot operates on a two-dimensional grid board and can move up, down, left, or right while following **transition rules** to update its **internal state** and the **color at its current position**.

Your task is to design the robot’s **transition rules** so that it visits a given sequence of destinations in order. Since the development cost is proportional to the sum of the number of colors and states used, it is desirable to minimize this sum as much as possible.

Problem Statement
--------

There is a board consisting of $N \times N$ cells. The top-left cell has coordinates $(0, 0)$, and a cell $i$ rows down and $j$ columns to the right has coordinates $(i, j)$. The outer edge of the $N \times N$ grid is surrounded by walls, and there may also be walls between adjacent cells.

Each cell can be painted with a color. Let $C$ be the total number of colors used, where each color is represented by an integer $0, 1, \ldots, C-1$. You may freely set the initial colors of the board.

The robot has one variable representing its **internal state**. This internal state can take any value from $0$ to $Q-1$, where $Q$ is the total number of possible states, which you may choose freely. The initial internal state is $0$.

Based on the current color $c$ of the cell and the internal state $q$, the robot determines its next action and simultaneously performs the following three operations:

- Repaints the current cell with color $A(c, q)$ (it may repaint with the same color).
- Updates its internal state to $S(c, q)$ (it may update to the same state).
- Moves in the direction $D(c, q)$ (up, down, left, right, or stays in place). If there is a wall between the current cell and the destination, the robot cannot move and stays in place.

Here, $A$, $S$, and $D$ are functions that define the **transition rules**. These transition rules must be designed before the robot starts operating and cannot be changed during operation. Also, the robot's actions do not depend on its current position, only on the current cell's color and the internal state.

#### Example of Robot Operation

![example](https://img.atcoder.jp/ahc056/zUbWUSnS.gif)

In the example above, the robot starts on a $3 \times 3$ board initially painted blue, at position $(0, 0)$, and operates according to the following three transition rules:

1. $A(\text{blue}, 0) = \text{green}$, $S(\text{blue}, 0) = 0$, $D(\text{blue}, 0) = \text{right}$
2. $A(\text{green}, 0) = \text{blue}$, $S(\text{green}, 0) = 1$, $D(\text{green}, 0) = \text{left}$
3. $A(\text{green}, 1) = \text{green}$, $S(\text{green}, 1) = 1$, $D(\text{green}, 1) = \text{down}$

In the first three steps, transition rule 1 is repeatedly applied, repainting the cell green and moving right. At the third step, the robot hits a wall and cannot move, so it stays in place. In the fourth step, since the current cell is green, transition rule 2 is applied, repainting it blue, moving left, and changing the internal state to 1. Finally, in the fifth step, since the current cell is green and the internal state is 1, transition rule 3 is applied, and the robot moves down.

A sequence of $K$ destination cells $(x_0, y_0), (x_1, y_1), \ldots, (x_{K-1}, y_{K-1})$ and an upper limit $T$ on the number of steps are given. The robot starts from the cell $(x_0, y_0)$ and aims to visit all destinations in the specified order within $T$ steps.

If the robot visits a destination $(x_j, y_j)$ before it is its turn (i.e., before reaching all prior destinations $(x_i, y_i)$ for $i < j$), that visit does not count. The robot must reach $(x_j, y_j)$ again once it becomes the current destination.

Design the initial color configuration of the board and the robot’s transition rules so that all destinations are visited in order.

Scoring
--------

Let $C$ be the number of colors used, $Q$ be the number of states used, and $V$ be the number of destinations successfully visited in order within the step limit $T$. Then, the absolute score is calculated as follows:

- If $V = K$: $C + Q$
- If $V < K$: $2N^4 + (K - V) \times N^2$

<font color="red">**The lower the absolute score, the better.**</font>

For each test case, we compute the <font color="red">**relative score**</font> $\mathrm{round}(10^9\times \frac{\mathrm{MIN}}{\mathrm{YOUR}})$, where YOUR is your absolute score and MIN is the lowest absolute score among all competitors obtained on that test case. The score of the submission is the sum of the relative scores.

The final ranking will be determined by the system test with more inputs which will be run after the contest is over. In both the provisional/system test, if your submission produces illegal output or exceeds the time limit for some test cases, only the score for those test cases will be zero, and your submission will be excluded from the MIN calculation for those test cases.

The system test will be performed only for <font color="red">**the last submission which received a result other than <span class="label label-warning" data-toggle="tooltip" data-placement="top" title="" data-original-title="Compilation Error">CE</span> **</font>. Be careful not to make a mistake in the final submission.

#### Number of test cases

- Provisional test: 50
- System test: 2000. We will publish <a href="https://img.atcoder.jp/ahc056/seeds.txt">seeds.txt</a> (sha256=c7a6f9526da67d83d1f8fed006e1b8f5edc8e4134444cf954e400a4dcd8bd130) after the contest is over.

#### About relative evaluation system

In both the provisional/system test, the standings will be calculated using only the last submission which received a result other than <span class="label label-warning" data-toggle="tooltip" data-placement="top" title="" data-original-title="Compilation Error">CE</span>. Only the last submissions are used to calculate the MIN for each test case when calculating the relative scores.

The scores shown in the standings are relative, and whenever a new submission arrives, all relative scores are recalculated. On the other hand, the score for each submission shown on the submissions page is the sum of the absolute score for each test case, and the relative scores are not shown. In order to know the relative score of submission other than the latest one in the current standings, you need to resubmit it. If your submission produces illegal output or exceeds the time limit for some test cases, the score shown on the submissions page will be 0, but the standings show the sum of the relative scores for the test cases that were answered correctly.

#### About execution time

Execution time may vary slightly from run to run. In addition, since system tests simultaneously perform a large number of executions, it has been observed that execution time increases by several percent compared to provisional tests. For these reasons, submissions that are very close to the time limit may result in <span class="label label-warning" data-toggle="tooltip" data-placement="top" title="Time Limit Exceeded">TLE</span> in the system test. Please measure the execution time in your program to terminate the process, or have enough margin in the execution time.

Input
--------

Input is given from Standard Input in the following format.

~~~
$N$ $K$ $T$
$v_{0,0}$ $\cdots$ $v_{0,N-2}$
$\vdots$
$v_{N-1,0}$ $\cdots$ $v_{N-1,N-2}$
$h_{0,0}$ $\cdots$ $h_{0,N-1}$
$\vdots$
$h_{N-2,0}$ $\cdots$ $h_{N-2,N-1}$
$x_0$ $y_0$
$\vdots$
$x_{K-1}$ $y_{K-1}$
~~~

- $N$ is the size of the board and satisfies $10 \leq N \leq 20$.
- $K$ is the number of destinations and satisfies $N \leq K \leq N^2$.
- Let $X$ be the minimum number of moves needed to visit all destinations in order. The step limit $T$ satisfies $X \leq T \leq 2X$.
- Each $v_{i,0} \cdots v_{i,N-2}$ is a binary string of length $N-1$. The $j$-th character $v_{i,j}$ indicates whether there is a wall (`1`) or not (`0`) between cell $(i, j)$ and cell $(i, j+1)$.
- Each $h_{i,0} \cdots h_{i,N-1}$ is a binary string of length $N$. The $j$-th character $h_{i,j}$ indicates whether there is a wall (`1`) or not (`0`) between cell $(i, j)$ and cell $(i+1, j)$.
- It is guaranteed that all cells are mutually reachable.
- $(x_k, y_k)$ represents the coordinates of the $k$-th destination and satisfies $0 \leq x_k, y_k \leq N-1$. All destinations are distinct.

Output
--------

Output to Standard Output in the following format.

~~~
$C$ $Q$ $M$
$s_{0,0}$ $\cdots$ $s_{0,N-1}$
$\vdots$
$s_{N-1,0}$ $\cdots$ $s_{N-1,N-1}$
$c_0$ $q_0$ $A(c_0,q_0)$ $S(c_0,q_0)$ $D(c_0,q_0)$
$\vdots$
$c_{M-1}$ $q_{M-1}$ $A(c_{M-1},q_{M-1})$ $S(c_{M-1},q_{M-1})$ $D(c_{M-1},q_{M-1})$
~~~

- $C$ is the number of colors used, and must satisfy $1 \le C \le N^4$.
- $Q$ is the number of internal states used, and must satisfy $1 \le Q \le N^4$.
- $M$ is the number of transition rules output, and must satisfy $0 \le M \le T$.
- $s_{i,j}$ is the initial color of cell $(i, j)$, and must satisfy $0 \le s_{i,j} \le C - 1$.
- Each line $c_i$ $q_i$ $A(c_i,q_i)$ $S(c_i,q_i)$ $D(c_i,q_i)$ represents a transition rule applied when the current color is $c_i$ and internal state is $q_i$:

  - $0 \le c_i \le C - 1$, $0 \le q_i \le Q - 1$
  - The same pair $(c_i, q_i)$ must not appear more than once.
  - Repaint color $A(c_i,q_i)$ must satisfy $0 \le A(c_i,q_i) \le C - 1$
  - New internal state $S(c_i,q_i)$ must satisfy $0 \le S(c_i,q_i) \le Q - 1$
  - Movement direction $D(c_i,q_i)$ must be one of the following five characters:

    - Up: `U`
    - Down: `D`
    - Left: `L`
    - Right: `R`
    - Stay in place: `S`

Since $C \times Q$ can be very large, it is not necessary to output transition rules for all $(c, q)$ pairs. It is sufficient to output rules only for pairs that may actually occur during the simulation. As there are at most $T$ steps, at most $T$ transition rules are sufficient.

However, if the robot encounters a $(c, q)$ pair during execution for which no transition rule has been output, its operation is terminated at that point.

<a href="https://img.atcoder.jp/ahc056/zUbWUSnS.html?lang=en&amp;seed=-1&amp;output=sample">Show example</a>

Input Generation
--------

Let $\mathrm{rand}(L, U)$ be a function that generates a uniformly random integer between $L$ and $U$, inclusive.

#### Board Generation

We refer to the corner points of the cells as "vertices."

First, determine the board size with $N = \mathrm{rand}(10, 20)$. Then determine the number of wall segments $W = \mathrm{rand}(0, N - 1)$. Start with a board where no internal walls exist between adjacent cells, and repeat the following process $W$ times:

Randomly choose one vertex that is not adjacent to any existing wall. Then choose one of the four directions (up, down, left, right) and extend a wall from that vertex in the chosen direction until it touches another wall.

#### Destination Generation

Determine the number of destinations with $K = \mathrm{rand}(N, N^2)$. Shuffle the $N^2$ cells uniformly at random, and select the first $K$ cells from this shuffled list as the destination sequence.

#### Generating $T$

Calculate the minimum number of moves $X$ required to visit all destinations in order. Then determine the step limit with $T = \mathrm{rand}(X, 2X)$.

Sample Solution (Python)
--------
<details>
~~~
# Input
N, K, T = map(int, input().split())
v = [input().strip() for _ in range(N)]
h = [input().strip() for _ in range(N - 1)]
targets = [tuple(map(int, input().split())) for _ in range(K)]

# Function to check if movement is possible
DIJ = {'U': (-1, 0), 'D': (1, 0), 'L': (0, -1), 'R': (0, 1)}
def can_move(i, j, d):
    if d == 'U':
        if i == 0: return False
        return h[i - 1][j] == '0'
    elif d == 'D':
        if i == N - 1: return False
        return h[i][j] == '0'
    elif d == 'L':
        if j == 0: return False
        return v[i][j - 1] == '0'
    elif d == 'R':
        if j == N - 1: return False
        return v[i][j] == '0'
    return False

# --- Strategy ---
# The internal state is always fixed to 0.
# Each cell is assigned a unique initial color; the color is never changed.
# The color thus represents the robot’s current position.
# The robot moves in a direction that decreases the Manhattan distance to target[1].
# If no such direction exists, it stops.
C = N * N
Q = 1
s = [[0] * N for _ in range(N)]
for i in range(N):
     for j in range(N):
          s[i][j] = i * N + j
rules = []
i, j = targets[0] # current position
gi, gj = targets[1] # first destination
for t in range(T):
    d = 'S'
    if i > gi and can_move(i, j, 'U'):
        d = 'U'
    elif i < gi and can_move(i, j, 'D'):
        d = 'D'
    elif j > gj and can_move(i, j, 'L'):
        d = 'L'
    elif j < gj and can_move(i, j, 'R'):
        d = 'R'
    if d == 'S':
        break
    rules.append((s[i][j], 0, s[i][j], 0, d))
    di, dj = DIJ[d]
    i, j = i + di, j + dj

# Output
print(C, Q, len(rules))
for r in range(N):
    print(' '.join(map(str, s[r])))
for c, q, A, S, D in rules:
    print(c, q, A, S, D)
~~~
</details>

Tools (Input generator and visualizer)
--------

- <a href="https://img.atcoder.jp/ahc056/zUbWUSnS.html?lang=en">Web version</a>: This is more powerful than the local version providing animations.
- <a href="https://img.atcoder.jp/ahc056/zUbWUSnS.zip">Local version</a>: You need a compilation environment of <a href="https://www.rust-lang.org/">Rust language</a>.

  - <a href="https://img.atcoder.jp/ahc056/zUbWUSnS_windows.zip">Pre-compiled binary for Windows</a>: If you are not familiar with the Rust language environment, please use this instead.

Please be aware that sharing visualization results or discussing solutions/ideas during the contest is prohibited.

Sample Input 1
--------

~~~
3 3 6
00
00
00
000
000
0 0
0 2
1 1
~~~

Sample Output 1
--------

~~~
2 2 3
0 0 0
0 0 0
0 0 0
0 0 1 0 R
1 0 0 1 L
1 1 1 1 D
~~~

This input and output correspond to the example of robot operation given in the problem statement.
They are for illustrative purposes and do not satisfy the input constraints.

Problem constraints:
time_limit=2.0 memory_limit=1073741824
