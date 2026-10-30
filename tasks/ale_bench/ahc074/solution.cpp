// AHC074 - Layered Barcode Display
// C++17 / C++20 / C++23. Submit this single file.
//
// 65 active prefix sheets, exact shortest legal transition for each order,
// correlation-optimized window order, and a future-accessibility tie-breaker.
// All remaining sheets contain only holes.
//
// The exactness guarantee concerns a transition with this sheet construction.
// Choosing the construction and optimizing the unknown future are heuristics.

#include <bits/stdc++.h>
namespace ahc074_layout {
struct Layout {
    std::vector<int> window; // local chain bit -> physical window
    std::vector<int> flip;   // local bit = physical bit XOR flip
    double canonical_estimate = 0;
    std::vector<uint64_t> encode(const std::vector<uint64_t>& input) const {
        std::vector<uint64_t> out(input.size());
        for (size_t a=0;a<input.size();++a)
            for (int j=0;j<(int)window.size();++j)
                out[a] |= uint64_t(((input[a]>>window[j])&1)^flip[j])<<j;
        return out;
    }
};
inline double estimate(const std::vector<uint64_t>& a,int n) {
    const int P=a.size();
    std::vector<std::array<unsigned char,65>> needs(P),guards(P);
    for(int t=0;t<P;t++) {
        for(int j=0;j<n;j++) needs[t][j]=(a[t]>>j)&1;
        needs[t][n]=!needs[t][n-1];
        int g=needs[t][n-1]?n-1:n;
        guards[t][n]=guards[t][n-1]=g;
        for(int j=n-2;j>=0;j--) { if(needs[t][j])g=j; guards[t][j]=g; }
    }
    long long sum=0,count=0;
    std::mt19937 rr(823194);
    for(int previous=0;previous<P;previous++) {
        int p[65],pos[65],len=0,last=-1;
        for(int r=0;r<n;r++)if(needs[previous][r]) {
            p[len++]=r;
            for(int j=last+1;j<r;j++)p[len++]=j;
            last=r;
        }
        if(needs[previous][n]) {
            p[len++]=n;
            for(int j=last+1;j<n;j++)p[len++]=j;
        }else p[len++]=n;
        for(int k=0;k<=n;k++)pos[p[k]]=k;
        for(int sample=0;sample<16;sample++) {
            int t=rr()%(P-1); if(t>=previous)t++;
            unsigned char forced[65]{},bad[65]{};
            int mn=n+1,total=0;
            for(int k=n;k>=0;k--) {
                int x=p[k],cap=std::min(x,n-1);
                if(cap>=mn) { forced[x]=1;total++; }
                if(needs[t][x])mn=std::min(mn,cap);
            }
            for(int x=0;x<=n;x++)if(!needs[t][x]&&!forced[x]) {
                int g=guards[t][x];
                if(!forced[g]&&pos[x]<pos[g])bad[g]=1;
            }
            for(int x=0;x<=n;x++)total+=bad[x];
            sum+=total;count++;
        }
    }
    return double(sum)/count;
}
inline Layout optimize(const std::vector<uint64_t>& input,int n=64,int iterations=200000) {
    int corr[64][64]{};
    for(int i=0;i<n;i++)for(int j=0;j<n;j++)for(auto x:input)
        corr[i][j]+=(((x>>i)&1)==((x>>j)&1)?1:-1);
    std::vector<int> p(n);std::iota(p.begin(),p.end(),0);
    auto weight=[&](const std::vector<int>& q) {
        int s=0;for(int i=1;i<n;i++)s+=std::abs(corr[q[i-1]][q[i]]);return s;
    };
    std::mt19937 rng(42);
    int value=weight(p),best=value;auto best_path=p;
    for(int it=0;it<iterations;it++) {
        int i=rng()%n,j=rng()%n;if(i>j)std::swap(i,j);
        int delta=0;
        if(i>0)delta+=std::abs(corr[p[i-1]][p[j]])-std::abs(corr[p[i-1]][p[i]]);
        if(j+1<n)delta+=std::abs(corr[p[i]][p[j+1]])-std::abs(corr[p[j]][p[j+1]]);
        double temperature=12*std::pow(.01,double(it%50000)/50000);
        if(delta>=0||std::uniform_real_distribution<double>(0,1)(rng)<std::exp(delta/temperature)) {
            std::reverse(p.begin()+i,p.begin()+j+1);value+=delta;
        }
        if(value>best) { best=value;best_path=p; }
    }
    Layout selected;double score=1e100;
    for(int variant=0;variant<4;variant++) {
        Layout q;q.window=best_path;
        if(variant>=2)std::reverse(q.window.begin(),q.window.end());
        q.flip.resize(n);q.flip[0]=variant&1;
        for(int j=1;j<n;j++)q.flip[j]=q.flip[j-1]^(corr[q.window[j-1]][q.window[j]]<0);
        q.canonical_estimate=estimate(q.encode(input),n);
        if(q.canonical_estimate<score) { score=q.canonical_estimate;selected=std::move(q); }
    }
    return selected;
}
}


using namespace std;

class PrefixChain {
    static constexpr int MAX_SHEETS = 65;
    int n;
    vector<int> coverage;
    vector<double> inversePowerOfTwo;

    struct StateInfo {
        array<unsigned char, MAX_SHEETS> required{}, forced{}, badGap{};
        array<int, MAX_SHEETS> guardian{}, position{}, obstructionCount{};
        int distance = 0;
    };

    StateInfo analyze(const vector<int>& order, uint64_t target) const {
        StateInfo s;
        for (int j = 0; j < n; ++j) s.required[j] = (target >> j) & 1;
        // The two longest sheets cover the same windows. Exactly one is required.
        s.required[n] = !s.required[n - 1];
        int g = s.required[n - 1] ? n - 1 : n;
        s.guardian[n] = s.guardian[n - 1] = g;
        for (int j = n - 2; j >= 0; --j) {
            if (s.required[j]) g = j;
            s.guardian[j] = g;
        }

        // A sheet is forced if it lies above a required sheet of no greater
        // coverage. That required sheet cannot become visible until it moves.
        int minimumRequiredCoverage = n + 1;
        for (int p = n; p >= 0; --p) {
            int x = order[p];
            s.position[x] = p;
            s.forced[x] = coverage[x] >= minimumRequiredCoverage;
            s.distance += s.forced[x];
            if (s.required[x]) {
                minimumRequiredCoverage = min(minimumRequiredCoverage, coverage[x]);
            }
        }

        // Each remaining obstruction belongs to exactly one guardian.
        // One additional move is necessary and sufficient for every bad gap.
        for (int x = 0; x <= n; ++x) {
            if (s.required[x] || s.forced[x]) continue;
            g = s.guardian[x];
            if (s.position[x] < s.position[g]) {
                ++s.obstructionCount[g];
                if (!s.forced[g] && !s.badGap[g]) {
                    s.badGap[g] = 1;
                    ++s.distance;
                }
            }
        }
        return s;
    }

    // Find all insertion positions for a visible sheet that decrease the exact
    // distance by one. Positions refer to the order AFTER removing that sheet.
    bool improvingInterval(const vector<int>& order, int from,
                           const StateInfo& s, int& low, int& high) const {
        int x = order[from];
        low = 0;
        high = n;
        array<unsigned char, MAX_SHEETS> usedGap{};

        if (s.forced[x]) {
            for (int p = 0; p <= n; ++p) {
                if (p == from) continue;
                int y = order[p];
                int afterRemoval = p - (p > from);

                // Clear the forced charge on x.
                if (s.required[y] && coverage[y] <= coverage[x]) {
                    low = max(low, afterRemoval + 1);
                }
                if (s.required[x]) {
                    if (!s.forced[y] && coverage[y] >= coverage[x]) {
                        // Passing y would create a forced charge on y. This is
                        // allowed only if it replaces an existing bad-gap charge.
                        int gap = -1;
                        if (s.required[y] && s.badGap[y]) {
                            gap = y;
                        } else if (!s.required[y] && s.badGap[s.guardian[y]] &&
                                   s.obstructionCount[s.guardian[y]] == 1 &&
                                   s.position[y] < s.position[s.guardian[y]]) {
                            gap = s.guardian[y];
                        }
                        if (gap < 0 || usedGap[gap]) {
                            high = min(high, afterRemoval);
                        } else {
                            usedGap[gap] = 1;
                        }
                    }
                    // Do not create a new bad gap for x itself.
                    if (!s.required[y] && !s.forced[y] && s.guardian[y] == x) {
                        high = min(high, afterRemoval);
                    }
                }
            }
            if (!s.required[x] && !s.forced[s.guardian[x]] &&
                !s.badGap[s.guardian[x]]) {
                int p = s.position[s.guardian[x]];
                p -= p > from;
                low = max(low, p + 1);
            }
        } else if (s.badGap[x]) {
            // Promote a bad guardian above its obstructions, while preserving
            // every smaller required record.
            for (int p = 0; p <= n; ++p) {
                if (p == from) continue;
                int y = order[p];
                int afterRemoval = p - (p > from);
                if (s.required[y] && coverage[y] < coverage[x]) {
                    low = max(low, afterRemoval + 1);
                }
                if (!s.required[y] && !s.forced[y] && s.guardian[y] == x) {
                    high = min(high, afterRemoval);
                }
            }
        } else if (!s.required[x] && s.badGap[s.guardian[x]]) {
            // Instead of promoting the guardian, its sole obstruction can move.
            int g = s.guardian[x];
            if (from >= s.position[g] || s.obstructionCount[g] != 1) return false;
            low = s.position[g];
        } else {
            return false;
        }
        return low <= high;
    }

public:
    explicit PrefixChain(int windows)
        : n(windows), coverage(n + 1), inversePowerOfTwo(n + 2) {
        for (int x = 0; x <= n; ++x) coverage[x] = min(x, n - 1);
        inversePowerOfTwo[0] = 1;
        for (int x = 1; x <= n + 1; ++x) {
            inversePowerOfTwo[x] = 0.5 * inversePowerOfTwo[x - 1];
        }
    }

    vector<pair<int, int>> serve(vector<int>& order, uint64_t target) const {
        vector<pair<int, int>> moves;
        moves.reserve(n + 1);
        while (true) {
            StateInfo s = analyze(order, target);
            if (s.distance == 0) return moves;

            double bestPotential = 1e100;
            int bestFrom = -1, bestDestination = -1;
            int maximumCoverage = -1;
            for (int from = 0; from <= n; ++from) {
                int x = order[from];
                // For nested prefix supports, precisely these record sheets
                // are visible through at least one window.
                if (coverage[x] <= maximumCoverage) continue;
                maximumCoverage = coverage[x];

                int low, high;
                if (!improvingInterval(order, from, s, low, high)) continue;
                vector<int> remaining = order;
                remaining.erase(remaining.begin() + from);

                // U = sum_x (1 - 2^(-c_x)), where c_x is the number of later
                // sheets of no greater coverage. This is the expected forced
                // part of next-transition cost for independent fair target bits.
                // Sweep all insertion positions in O(N), rather than recomputing
                // U from scratch at every position.
                array<int, MAX_SHEETS> inversions{};
                int smallerAfterX = 0;
                double base = 0;
                uint64_t seenCoverage = 0;
                int seenCount = 0;
                for (int p = n - 1; p >= 0; --p) {
                    int c = coverage[remaining[p]];
                    inversions[p] = c == n - 1
                        ? seenCount
                        : __builtin_popcountll(seenCoverage & ((1ULL << (c + 1)) - 1));
                    base += 1 - inversePowerOfTwo[inversions[p]];
                    smallerAfterX += c <= coverage[x];
                    seenCoverage |= 1ULL << c;
                    ++seenCount;
                }
                double earlierContribution = 0;
                for (int destination = 0; destination <= n; ++destination) {
                    if (destination >= low && destination <= high && destination != from) {
                        double potential = base + 1 - inversePowerOfTwo[smallerAfterX]
                                             + earlierContribution;
                        if (potential < bestPotential - 1e-12) {
                            bestPotential = potential;
                            bestFrom = from;
                            bestDestination = destination;
                        }
                    }
                    if (destination < n) {
                        int c = coverage[remaining[destination]];
                        if (c <= coverage[x]) --smallerAfterX;
                        if (c >= coverage[x]) {
                            earlierContribution += inversePowerOfTwo[inversions[destination] + 1];
                        }
                    }
                }
            }

            // The distance characterization guarantees at least one such move.
            assert(bestFrom >= 0);
            int sheet = order[bestFrom];
            order.erase(order.begin() + bestFrom);
            order.insert(order.begin() + bestDestination, sheet);
            moves.emplace_back(sheet, bestDestination);
#ifdef LOCAL
            assert(analyze(order, target).distance == s.distance - 1);
            assert(moves.size() <= size_t(n + 1));
#endif
        }
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int N, K, P, R;
    if (!(cin >> N >> K >> P >> R)) return 0;
    vector<uint64_t> menu(P);
    for (int i = 0; i < P; ++i) {
        string barcode;
        cin >> barcode;
        for (int j = 0; j < N; ++j) {
            if (barcode[j] == '1') menu[i] |= 1ULL << j;
        }
    }

    // The official constraints are N=64 and K=192. The construction needs N+1.
    assert(1 <= N && N <= 64 && K >= N + 1);
    auto layout = ahc074_layout::optimize(menu, N);
    menu = layout.encode(menu);
    PrefixChain solver(N);

    for (int sheet = 0; sheet < K; ++sheet) {
        string pattern(N, '.');
        if (sheet <= N) {
            for (int j = 0; j < min(sheet, N); ++j) {
                pattern[layout.window[j]] = char('0' + layout.flip[j]);
            }
            if (sheet < N) {
                pattern[layout.window[sheet]] = char('0' + (1 ^ layout.flip[sheet]));
            }
        }
        cout << pattern << '\n';
    }
    cout << flush;

    // The active sheets remain a contiguous prefix; unused all-hole sheets
    // stay below them. Thus local insertion positions are also global positions.
    vector<int> order(N + 1);
    iota(order.begin(), order.end(), 0);
    for (int r = 0; r < R; ++r) {
        int item;
        if (!(cin >> item) || item == -1) return 0;
        auto moves = solver.serve(order, menu[item]);
        cout << moves.size() << '\n';
        for (auto [sheet, destination] : moves) {
            cout << sheet << ' ' << destination << '\n';
        }
        cout << flush;
    }
    return 0;
}
