import React from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { User, Mail, Phone, Calendar, ShieldCheck, ShieldAlert } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">Gamer Profile</h1>
        <p className="text-muted-foreground mt-2">Your identity on Gamerbuddy.</p>
      </div>

      <Card className="border-border bg-card/40 overflow-hidden relative">
        {/* Decorative background element */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
        
        <CardHeader className="relative z-10 pb-2">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 bg-background border-2 border-primary rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)]">
              <span className="text-3xl font-bold text-primary uppercase">{user.name.charAt(0)}</span>
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-white uppercase">{user.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {user.idVerified ? (
                  <span className="flex items-center text-xs font-bold uppercase tracking-wider text-green-500 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                    <ShieldCheck className="w-3 h-3 mr-1" /> ID Verified
                  </span>
                ) : (
                  <span className="flex items-center text-xs font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
                    <ShieldAlert className="w-3 h-3 mr-1" /> Unverified
                  </span>
                )}
                <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border border-border">
                  ID: #{user.id}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="relative z-10 mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 p-4 bg-background/50 rounded-lg border border-border">
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email Address
              </div>
              <div className="font-mono text-sm">{user.email}</div>
            </div>
            
            <div className="space-y-1 p-4 bg-background/50 rounded-lg border border-border">
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4" /> Phone Number
              </div>
              <div className="font-mono text-sm">{user.phone}</div>
            </div>
            
            <div className="space-y-1 p-4 bg-background/50 rounded-lg border border-border md:col-span-2">
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Member Since
              </div>
              <div className="font-mono text-sm">{format(new Date(user.createdAt), 'MMMM do, yyyy')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}