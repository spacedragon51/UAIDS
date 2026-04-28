import { useAuth } from "@/hooks/useAuth";
import { LogOut, User } from "lucide-react";

export default function UserMenu() {
  const { user, roles, signOut } = useAuth();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {roles.map((role) => (
          <span key={role} className="px-2 py-0.5 text-xs bg-primary/15 text-primary rounded-full font-medium capitalize">{role}</span>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <User size={14} />
        <span className="max-w-[120px] truncate">{user.email}</span>
      </div>
      <button onClick={signOut} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10" title="Sign out">
        <LogOut size={16} />
      </button>
    </div>
  );
}
