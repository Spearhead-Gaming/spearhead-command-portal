import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

type SearchInputProps = {
  placeholder?: string;
};

export function SearchInput({
  placeholder = "Search placeholder results",
}: SearchInputProps) {
  return (
    <label className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" placeholder={placeholder} readOnly value="" />
    </label>
  );
}
