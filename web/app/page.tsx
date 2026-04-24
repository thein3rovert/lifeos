import { Card, CardContent } from "@/components/ui/card";
import { Folder, FileText, CheckCircle, Clock } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-[1400px] animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back! 👋</h1>
          <p className="text-muted-foreground mt-2">
            <span className="font-semibold text-foreground">4</span> Tasks Due Today &middot; <span className="font-semibold text-foreground">2</span> Overdue &middot; <span className="font-semibold text-foreground">8</span> Upcoming
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-5 grid-cols-4">
        <Card className="border-border/40 shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                <p className="text-4xl font-bold tracking-tight">15</p>
                <p className="text-xs text-emerald-500 font-medium">+5 vs last month</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl">
                <Folder className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-4xl font-bold tracking-tight">10</p>
                <p className="text-xs text-emerald-500 font-medium">+2 vs last month</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">In Reviews</p>
                <p className="text-4xl font-bold tracking-tight">23</p>
                <p className="text-xs text-emerald-500 font-medium">+12 vs last month</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-4xl font-bold tracking-tight">50</p>
                <p className="text-xs text-emerald-500 font-medium">+15 vs last month</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-3 gap-5">
        {/* Today's Tasks */}
        <Card className="col-span-2 border-border/40 shadow-sm">
          <div className="p-6 border-b border-border/40">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Today's Tasks</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  className="h-9 w-56 rounded-lg border border-border/40 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-border transition-all"
                />
                <button className="h-9 px-4 rounded-lg border border-border/40 bg-background text-sm font-medium hover:bg-muted/50 transition-all">
                  Filter
                </button>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-3 border-b border-border/40">
                <div className="col-span-5">Task Name</div>
                <div className="col-span-4">Project</div>
                <div className="col-span-3">Due Date</div>
              </div>
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No tasks scheduled for today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card className="border-border/40 shadow-sm">
          <div className="p-6 border-b border-border/40">
            <h2 className="text-xl font-semibold">Performance</h2>
          </div>
          <CardContent className="p-6">
            <div className="text-center space-y-3">
              <div className="text-6xl font-bold tracking-tight">86%</div>
              <p className="text-sm text-emerald-500 font-medium">+15% vs last week</p>
              <p className="text-sm text-muted-foreground">Task completion rate</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}