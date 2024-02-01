import { cn } from "helpers/common.helper";
import React, { useState, useRef, useEffect, ReactNode, MutableRefObject } from "react";

type Props = {
  defaultHeight?: number;
  verticalOffset?: number;
  horizonatlOffset?: number;
  root?: MutableRefObject<HTMLElement | null>;
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
  classNames?: string;
  alwaysRender?: boolean;
};

const RenderIfVisible: React.FC<Props> = (props) => {
  const {
    defaultHeight = 300,
    root,
    verticalOffset = 50,
    horizonatlOffset = 0,
    as = "div",
    children,
    classNames = "",
    alwaysRender = false,
    ...others
  } = props;
  const [shouldVisible, setShouldVisible] = useState<boolean>(alwaysRender);
  const placeholderHeight = useRef<number>(defaultHeight);
  const intersectionRef = useRef<HTMLElement | null>(null);

  const isVisible = alwaysRender || shouldVisible;

  // Set visibility with intersection observer
  useEffect(() => {
    if (intersectionRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (typeof window !== undefined && window.requestIdleCallback) {
            window.requestIdleCallback(() => setShouldVisible(entries[0].isIntersecting), {
              timeout: 600,
            });
          } else {
            setShouldVisible(entries[0].isIntersecting);
          }
        },
        {
          root: root?.current,
          rootMargin: `${verticalOffset}% ${horizonatlOffset}% ${verticalOffset}% ${horizonatlOffset}%`,
        }
      );
      observer.observe(intersectionRef.current);
      return () => {
        if (intersectionRef.current) {
          observer.unobserve(intersectionRef.current);
        }
      };
    }
  }, [root?.current, intersectionRef, children]);

  // Set height after render
  useEffect(() => {
    if (intersectionRef.current && isVisible) {
      placeholderHeight.current = intersectionRef.current.offsetHeight;
    }
  }, [isVisible, intersectionRef, alwaysRender]);

  const child = isVisible ? <>{children}</> : null;
  const style = isVisible ? {} : { height: placeholderHeight.current, width: "100%" };
  const className = isVisible ? classNames : cn(classNames, "animate-pulse");

  return React.createElement(as, { ref: intersectionRef, style, className }, child);
};

export default RenderIfVisible;