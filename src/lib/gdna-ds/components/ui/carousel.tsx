import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";
type Options = Parameters<typeof useEmblaCarousel>[0];
type Api = ReturnType<typeof useEmblaCarousel>[1];
const Context = React.createContext<{
  ref: ReturnType<typeof useEmblaCarousel>[0];
  api: Api;
  previous: boolean;
  next: boolean;
} | null>(null);
function useCarousel() {
  const ctx = React.useContext(Context);
  if (!ctx) throw new Error("Carousel controls require Carousel");
  return ctx;
}
export function Carousel({
  opts,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { opts?: Options }) {
  const [ref, api] = useEmblaCarousel(opts);
  const [previous, setPrevious] = React.useState(false);
  const [next, setNext] = React.useState(false);
  React.useEffect(() => {
    if (!api) return;
    const update = () => {
      setPrevious(api.canScrollPrev());
      setNext(api.canScrollNext());
    };
    update();
    api.on("select", update).on("reInit", update);
    return () => {
      api.off("select", update).off("reInit", update);
    };
  }, [api]);
  return (
    <Context.Provider value={{ ref, api, previous, next }}>
      <div
        role="region"
        aria-roledescription="carousel"
        className={cn("relative", className)}
        {...props}
      >
        {children}
      </div>
    </Context.Provider>
  );
}
export function CarouselContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { ref } = useCarousel();
  return (
    <div ref={ref} className="overflow-hidden">
      <div className={cn("flex", className)} {...props} />
    </div>
  );
}
export function CarouselItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      className={cn("min-w-0 shrink-0 grow-0 basis-full", className)}
      {...props}
    />
  );
}
export function CarouselPrevious(props: React.ComponentProps<typeof Button>) {
  const { api, previous } = useCarousel();
  return (
    <Button
      type="button"
      aria-label="Previous slide"
      disabled={!previous}
      onClick={() => api?.scrollPrev()}
      {...props}
    >
      ←<span className="sr-only">Previous slide</span>
    </Button>
  );
}
export function CarouselNext(props: React.ComponentProps<typeof Button>) {
  const { api, next } = useCarousel();
  return (
    <Button
      type="button"
      aria-label="Next slide"
      disabled={!next}
      onClick={() => api?.scrollNext()}
      {...props}
    >
      →<span className="sr-only">Next slide</span>
    </Button>
  );
}
