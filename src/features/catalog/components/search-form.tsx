import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** GET form that puts the search text in ?q= so the server component can filter in Prisma. */
export function SearchForm({ action, defaultValue, placeholder }: { action: string; defaultValue?: string; placeholder: string }) {
  return (
    <form action={action} method="get" className="flex w-full max-w-md items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={defaultValue} placeholder={placeholder} className="pl-8" aria-label="Search" />
      </div>
      <Button type="submit" variant="outline">
        Search
      </Button>
    </form>
  );
}
