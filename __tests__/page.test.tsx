import { render, screen } from "@testing-library/react";
import Home from "@/app/page";
import { lessons } from "@/app/lessons/data";
import { layerLessons } from "@/app/layer/data";

describe("Home page", () => {
  it("renders the main heading", () => {
    render(<Home />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Vim");
    expect(h1).toHaveTextContent("HHKB");
  });

  it("links to every Vim lesson", () => {
    const { container } = render(<Home />);
    for (const l of lessons) {
      const link = container.querySelector(`a[href="/lessons/${l.id}"]`);
      expect(link).not.toBeNull();
      expect(link).toHaveTextContent(l.title);
    }
  });

  it("links to every layer lesson", () => {
    const { container } = render(<Home />);
    for (const l of layerLessons) {
      const link = container.querySelector(`a[href="/layer/${l.id}"]`);
      expect(link).not.toBeNull();
      expect(link).toHaveTextContent(l.title);
    }
  });
});
