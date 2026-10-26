import { Component, type ReactNode } from "react";
import { Button } from "@workspace/gdna-ds/components/ui/button";

/** Recover only the input; never reload or discard the conversation on failure. */
export class MessageInputBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error("Message input render failed", error.name); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert">
      <p>تعذر عرض خانة الرسالة. المحادثة محفوظة.</p>
      <Button type="button" onClick={() => this.setState({ failed: false })}>إعادة المحاولة</Button>
    </div>;
  }
}