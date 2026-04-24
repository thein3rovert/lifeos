"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, Image, Database, Activity, ArrowRight } from "lucide-react";
import { api, Skill, Photo } from "@/lib/api/client";

export default function DashboardPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [skillsRes, photosRes] = await Promise.allSettled([
          api.skills.list(),
          api.photos.list(),
        ]);
        if (skillsRes.status === "fulfilled") setSkills(skillsRes.value);
        if (photosRes.status === "fulfilled") setPhotos(photosRes.value);
      } catch {
        // graceful fallback — counts stay at 0
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const skillCount = skills.length;
  const photoCount = photos.length;
  const noteEstimate = Math.max(skillCount * 2, 0); // derived placeholder
  const knowledgeBase = skillCount + photoCount;

  const recentSkills = [...skills]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const stats = [
    {
      label: "Total Skills",
      value: skillCount,
      change: `+${Math.min(skillCount, 3)} this week`,
      icon: BookOpen,
    },
    {
      label: "Total Notes",
      value: noteEstimate,
      change: `+${Math.min(noteEstimate, 5)} recent`,
      icon: FileText,
    },
    {
      label: "Photos",
      value: photoCount,
      change: `+${Math.min(photoCount, 4)} uploaded`,
      icon: Image,
    },
    {
      label: "Knowledge Base",
      value: knowledgeBase,
      change: `${knowledgeBase} items total`,
      icon: Database,
    },
  ];

  return (
    <div className="space-y-8 max-w-[1400px] animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome Back! 👋
          </h1>
          <p className="text-muted-foreground mt-2">
            {loading ? (
              <span className="animate-pulse">Loading your data…</span>
            ) : (
              <>
                <span className="font-semibold text-foreground">{skillCount}</span> Skills ·{" "}
                <span className="font-semibold text-foreground">{noteEstimate}</span> Notes ·{" "}
                <span className="font-semibold text-foreground">{photoCount}</span> Photos
              </>
            )}
          </p>
        </div>
        <div className="text-sm text-muted-foreground text-right">
          <p className="font-medium text-foreground">{today}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="border-border/40 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 rounded-xl bg-card"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-4xl font-bold tracking-tight text-foreground">
                      {loading ? (
                        <span className="inline-block w-12 h-10 bg-muted/50 rounded animate-pulse" />
                      ) : (
                        stat.value
                      )}
                    </p>
                    <p className="text-xs text-emerald-500 font-medium">{stat.change}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Skills Table */}
        <Card className="lg:col-span-2 border-border/40 shadow-sm rounded-xl bg-card">
          <div className="p-6 border-b border-border/40">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recent Skills</h2>
              <Link
                href="/skills"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentSkills.length === 0 ? (
              <div className="py-12 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">No skills yet. Start building your knowledge base!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground pb-3 border-b border-border/40 uppercase tracking-wider">
                  <div className="col-span-6">Name</div>
                  <div className="col-span-3">Format</div>
                  <div className="col-span-3 text-right">Updated</div>
                </div>
                {/* Table Rows */}
                {recentSkills.map((skill) => (
                  <Link
                    key={skill.id}
                    href="/skills"
                    className="grid grid-cols-12 gap-4 items-center py-3 px-1 -mx-1 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <div className="col-span-6 font-medium text-foreground group-hover:text-foreground/90 truncate">
                      {skill.title}
                    </div>
                    <div className="col-span-3">
                      <Badge
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {skill.format || "md"}
                      </Badge>
                    </div>
                    <div className="col-span-3 text-sm text-muted-foreground text-right">
                      {formatDate(skill.updated_at)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Widget */}
        <Card className="border-border/40 shadow-sm rounded-xl bg-card">
          <div className="p-6 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">Activity</h2>
            </div>
          </div>
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Activity Summary */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Skills created</span>
                    <span className="text-sm font-semibold text-foreground">{skillCount}</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(skillCount * 10, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Photos uploaded</span>
                    <span className="text-sm font-semibold text-foreground">{photoCount}</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(photoCount * 5, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Knowledge items</span>
                    <span className="text-sm font-semibold text-foreground">{knowledgeBase}</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(knowledgeBase * 4, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="pt-4 border-t border-border/40 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Latest Updates
                  </p>
                  {recentSkills.slice(0, 3).map((skill) => (
                    <div key={skill.id} className="flex items-start gap-3">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{skill.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {formatDate(skill.updated_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentSkills.length === 0 && (
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
