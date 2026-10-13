import { cn } from "@/lib/utils";

// 设计系统类已迁移至 globals.css（规格 O2），全局可用、单一来源。
// 此前位于 ui.module.css（CSS Module 类名被 hash），draw/result 页的裸字符串引用失效。

export function MysticalBg({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mystical-bg", className)}>
      <div className="stars"></div>
      {children}
    </div>
  );
}

export function MysticalCard({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("mystical-card", className)} {...props}>
      {children}
    </div>
  );
}

export function MysticalButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button className={cn("mystical-button", className)} {...props}>
      {children}
    </button>
  );
}

export function MysticalInput({
  className,
  ...props
}: React.ComponentProps<"input"> & React.ComponentProps<"textarea">) {
  const Component = (props as React.ComponentProps<"textarea">).rows ? "textarea" : "input";
  return (
    <Component className={cn("mystical-input", className)} {...props} />
  );
}
