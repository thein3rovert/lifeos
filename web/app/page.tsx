import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, FileText, CheckCircle, Clock } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome Back! 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-semibold text-white">4</span> Tasks Due Today, <span className="font-semibold text-white">2</span> Overdue Tasks, <span className="font-semibold text-white">8</span> Upcoming Deadlines (This Week)
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Last Updated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-4">
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a] transition-all">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Total Projects</p>
                <p className="text-4xl font-bold mb-1">15</p>
                <p className="text-xs text-green-500">+5 vs last month</p>
              </div>
              <div className="p-2.5 bg-[#2a2a2a] rounded-lg">
                <Folder className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a] transition-all">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Total Task</p>
                <p className="text-4xl font-bold mb-1">10</p>
                <p className="text-xs text-green-500">+2 vs last month</p>
              </div>
              <div className="p-2.5 bg-[#2a2a2a] rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a] transition-all">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-2">In Reviews</p>
                <p className="text-4xl font-bold mb-1">23</p>
                <p className="text-xs text-green-500">+12 vs last month</p>
              </div>
              <div className="p-2.5 bg-[#2a2a2a] rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a] transition-all">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Completed Tasks</p>
                <p className="text-4xl font-bold mb-1">50</p>
                <p className="text-xs text-green-500">+15 vs last month</p>
              </div>
              <div className="p-2.5 bg-[#2a2a2a] rounded-lg">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Today's Tasks - Takes 2 columns */}
        <Card className="col-span-2 bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Today's Tasks</CardTitle>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search here..."
                  className="h-8 w-48 rounded-md border-0 bg-[#0f0f0f] px-3 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#2a2a2a]"
                />
                <button className="h-8 px-3 rounded-md bg-[#2a2a2a] text-xs text-white hover:bg-[#3a3a3a] transition-colors">
                  Filter
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 text-xs text-muted-foreground pb-2 border-b border-[#2a2a2a]">
                <div className="col-span-5">Task Name</div>
                <div className="col-span-4">Project</div>
                <div className="col-span-3">Due</div>
              </div>
              <p className="text-sm text-muted-foreground py-8 text-center">No tasks yet...</p>
            </div>
          </CardContent>
        </Card>

        {/* Performance - Takes 1 column */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">86%</div>
              <p className="text-xs text-green-500">+15% vs last Week</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}