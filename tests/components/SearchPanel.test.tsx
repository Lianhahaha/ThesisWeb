// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SearchPanel } from "@/components/SearchPanel";
import type { SearchInput } from "@/lib/search/params";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function Harness({ onSearch, pending = false }: { onSearch: (i: SearchInput) => void; pending?: boolean }) {
  const [value, setValue] = useState<SearchInput>({ query: "", fromYear: 2022, openAccessOnly: false, country: null });
  return <SearchPanel value={value} onChange={setValue} onSearch={onSearch} pending={pending} />;
}

describe("SearchPanel", () => {
  it("needs three characters, then searches with the words trimmed", () => {
    const onSearch = vi.fn();
    render(<Harness onSearch={onSearch} />);
    const box = screen.getByLabelText("Your topic");
    const button = screen.getByRole("button", { name: "Search" }) as HTMLButtonElement;
    fireEvent.change(box, { target: { value: "ab" } });
    expect(button.disabled).toBe(true);
    fireEvent.change(box, { target: { value: "  teacher burnout  " } });
    fireEvent.click(button);
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ query: "teacher burnout", fromYear: 2022 }));
  });

  it("shows recent searches from this browser and runs one in a click", () => {
    localStorage.setItem("tw-search-history", JSON.stringify(["jeepney modernization drivers"]));
    const onSearch = vi.fn();
    render(<Harness onSearch={onSearch} />);
    fireEvent.click(screen.getByRole("button", { name: "jeepney modernization drivers" }));
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ query: "jeepney modernization drivers" }));
  });

  it("says it is searching and blocks a second search meanwhile", () => {
    render(<Harness onSearch={() => {}} pending />);
    expect((screen.getByRole("button", { name: "Searching…" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
