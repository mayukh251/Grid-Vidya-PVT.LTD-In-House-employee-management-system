"use client";

import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const revenueData = [
  { day: "Mon", value: 12150 },
  { day: "Tue", value: 14320 },
  { day: "Wed", value: 16540 },
  { day: "Thu", value: 19010 },
  { day: "Fri", value: 15120 },
  { day: "Sat", value: 17560 },
  { day: "Sun", value: 18240 },
];

const capacityData = [
  { day: "Mon", capacity: 78 },
  { day: "Tue", capacity: 82 },
  { day: "Wed", capacity: 91 },
  { day: "Thu", capacity: 88 },
  { day: "Fri", capacity: 95 },
  { day: "Sat", capacity: 93 },
  { day: "Sun", capacity: 70 },
];

const radialData = [
  { name: "Complete", value: 74, fill: "#ef6c5f" },
  { name: "Remaining", value: 26, fill: "rgba(255,255,255,0.18)" },
];

const projects = [
  {
    task: "Help DStudio get more customers",
    assign: "Phoenix Winters",
    status: "In Progress",
  },
  {
    task: "Plan a trip",
    assign: "Cohen Merritt",
    status: "Pending",
  },
  {
    task: "Return a package",
    assign: "Lukas Juarez",
    status: "Completed",
  },
];

export function OverviewGrid() {
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-12 gap-5">
        <article className="card-shell col-span-12 bg-gradient-to-br from-[#f06757] via-[#ee6c5f] to-[#ff8f7f] lg:col-span-6">
          <div className="mb-4 flex items-center justify-between border-b border-black/20 pb-3 text-black/85">
            <h2 className="font-[var(--font-display)] text-4xl uppercase leading-none">Revenue</h2>
            <span className="rounded-full bg-black/10 px-3 py-1 text-xs uppercase">This Week</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_190px]">
            <div className="h-[210px] rounded-2xl bg-white/10 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <XAxis dataKey="day" tick={{ fill: "#3a2223", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "rgba(30,30,30,0.06)" }}
                    contentStyle={{
                      background: "#272327",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                    {revenueData.map((entry, index) => (
                      <Cell
                        key={entry.day}
                        fill={index === 3 ? "rgba(192,236,224,0.95)" : "rgba(241,203,190,0.8)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3 text-black/90">
              <div className="rounded-2xl bg-white/30 p-3">
                <p className="text-xs uppercase">Gross Revenue</p>
                <p className="metric-title mt-2 text-3xl">$156,900.67</p>
              </div>
              <div className="rounded-2xl bg-white/30 p-3">
                <p className="text-xs uppercase">Avg. Order Value</p>
                <p className="metric-title mt-2 text-3xl">$18.50</p>
              </div>
            </div>
          </div>
        </article>

        <article className="card-shell col-span-12 bg-gradient-to-br from-[#5b64f7] via-[#7674ff] to-[#5058dd] lg:col-span-4">
          <div className="mb-3 flex items-start justify-between">
            <h2 className="font-[var(--font-display)] text-3xl uppercase text-white">Venue Capacity</h2>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs text-white/80">This Week</span>
          </div>

          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={capacityData}>
                <XAxis dataKey="day" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "#1e223a",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Line type="monotone" dataKey="capacity" stroke="#ff9e8f" strokeWidth={3} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex justify-between text-xs text-white/80">
            {capacityData.map((item) => (
              <span key={item.day}>{item.capacity}%</span>
            ))}
          </div>
        </article>

        <article className="card-shell col-span-12 bg-gradient-to-br from-[#23252d] to-[#2d2834] lg:col-span-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-500 text-black">
            !
          </div>
          <h2 className="mt-4 font-[var(--font-display)] text-2xl uppercase leading-none text-white">
            Stabilizing Labor Cost
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Approve critical alerts and check inventory risk. Shift ends in 2:59:12 hours.
          </p>
        </article>
      </section>

      <section className="grid grid-cols-12 gap-5">
        <article className="card-shell col-span-12 overflow-hidden bg-gradient-to-br from-[#a5e7ff] to-[#7bcbff] text-[#0f2c38] lg:col-span-4">
          <div className="mb-3 flex items-start justify-between">
            <h2 className="font-[var(--font-display)] text-3xl uppercase">Points Map</h2>
            <span className="rounded-full bg-[#0f2c38]/12 px-3 py-1 text-xs">All points</span>
          </div>

          <div className="relative h-[220px] rounded-2xl border border-[#0f2c38]/20 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.5),transparent_45%),repeating-linear-gradient(0deg,rgba(15,44,56,0.08),rgba(15,44,56,0.08)_1px,transparent_1px,transparent_12px),repeating-linear-gradient(90deg,rgba(15,44,56,0.08),rgba(15,44,56,0.08)_1px,transparent_1px,transparent_12px)]">
            <div className="absolute left-[20%] top-[68%] h-4 w-4 rounded-full border-2 border-white bg-[#ef6b5f]" />
            <div className="absolute left-[48%] top-[42%] h-4 w-4 rounded-full border-2 border-white bg-[#ef6b5f]" />
            <div className="absolute left-[74%] top-[74%] h-4 w-4 rounded-full border-2 border-white bg-[#ef6b5f]" />
            <div className="absolute left-[28%] top-[46%] rounded-2xl bg-[#202530] px-4 py-3 text-white shadow-xl">
              <p className="text-xs text-white/65">The Daily Grind</p>
              <p className="text-sm">Astoria, NY</p>
            </div>
          </div>
        </article>

        <article className="card-shell col-span-12 bg-gradient-to-br from-[#dbe8e0] to-[#b3c7b8] text-[#2e3731] lg:col-span-4">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-[var(--font-display)] text-3xl uppercase leading-none">Operational Timing</h2>
            <span className="text-xs">UTC-5</span>
          </div>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={radialData}
                  dataKey="value"
                  innerRadius={58}
                  outerRadius={86}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#ef6b5f]" /> Peak
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#83958c]" /> Completion 74%
            </span>
          </div>
        </article>

        <article className="card-shell col-span-12 bg-gradient-to-br from-[#292a32] to-[#22232b] lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[var(--font-display)] text-3xl uppercase text-white">AI Operations Lead</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">Live</span>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-white/[0.06] p-3 text-sm text-white/85">
              Hi, Hanna. The Daily Grind shows strong revenue, but two flags need attention.
            </div>
            <div className="rounded-2xl bg-cyan-300/90 p-3 text-sm text-[#0f2c38]">
              Show labor cost and initiate strategy planning.
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-full bg-cyan-300/85 px-4 py-1.5 text-xs text-[#1d2b33]">Show labor cost</button>
              <button className="rounded-full bg-emerald-200/75 px-4 py-1.5 text-xs text-[#1d2b33]">Initiate strategy</button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-full bg-black/30 px-4 py-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ef6b5f] text-lg leading-none text-white">+</span>
            <input
              className="w-full bg-transparent text-sm text-white/80 outline-none placeholder:text-white/40"
              placeholder="Ask something or choose to start"
            />
          </div>
        </article>
      </section>

      <section className="card-shell overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="font-[var(--font-display)] text-2xl uppercase text-white">My Projects</h3>
          <button className="rounded-full bg-white/10 px-4 py-1.5 text-xs text-white/80">See All</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-white/70">
              <tr>
                <th className="px-5 py-3 font-medium">Task Name</th>
                <th className="px-5 py-3 font-medium">Assign</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((row) => (
                <tr key={row.task} className="border-t border-white/8">
                  <td className="px-5 py-3 text-white/90">{row.task}</td>
                  <td className="px-5 py-3 text-white/75">{row.assign}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        row.status === "In Progress"
                          ? "bg-emerald-300/25 text-emerald-200"
                          : row.status === "Pending"
                            ? "bg-fuchsia-300/25 text-fuchsia-200"
                            : "bg-blue-300/25 text-blue-200"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


