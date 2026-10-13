import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ApiKeySettings } from "@/app/components/ApiKeySettings";

function openModal() {
  fireEvent.click(screen.getByTitle("API设置"));
}

/**
 * 模拟非安全上下文（HTTP 公网直连）：`crypto.subtle` 不存在。
 * 这是「记住 Key」加密链路的真实前置条件——见 lib/apiKeyCrypto.ts。
 * 用实例自有属性遮蔽原型上的 getter，退出时 delete 还原。
 */
function withoutSubtle<T>(fn: () => T): T {
  Object.defineProperty(window.crypto, "subtle", {
    value: undefined,
    configurable: true,
  });
  try {
    return fn();
  } finally {
    delete (window.crypto as { subtle?: unknown }).subtle;
  }
}

describe("R1-D ApiKeySettings 掩码与记住开关", () => {
  it("默认掩码显示（type=password）", () => {
    render(<ApiKeySettings currentApiKey="" onApiKeyChange={vi.fn()} />);
    openModal();
    expect(screen.getByPlaceholderText("sk-...")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("切换显示明文", () => {
    render(<ApiKeySettings currentApiKey="" onApiKeyChange={vi.fn()} />);
    openModal();
    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.click(screen.getByText("显示"));
    expect(input).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByText("隐藏"));
    expect(input).toHaveAttribute("type", "password");
  });

  it("保存回调携带 remember 值（默认 true）", () => {
    const onChange = vi.fn();
    render(<ApiKeySettings currentApiKey="" onApiKeyChange={onChange} />);
    openModal();
    fireEvent.change(screen.getByPlaceholderText("sk-..."), {
      target: { value: "sk-x" },
    });
    fireEvent.click(screen.getByText("保存"));
    expect(onChange).toHaveBeenCalledWith("sk-x", true);
  });

  it("取消记住后保存携带 remember=false", () => {
    const onChange = vi.fn();
    render(<ApiKeySettings currentApiKey="" onApiKeyChange={onChange} />);
    openModal();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByPlaceholderText("sk-..."), {
      target: { value: "sk-x" },
    });
    fireEvent.click(screen.getByText("保存"));
    expect(onChange).toHaveBeenCalledWith("sk-x", false);
  });

  it("清除回调", () => {
    const onChange = vi.fn();
    render(<ApiKeySettings currentApiKey="sk-1" onApiKeyChange={onChange} />);
    openModal();
    fireEvent.click(screen.getByText("清除已保存的api key"));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("显示记住说明与加密边界文案", () => {
    render(<ApiKeySettings currentApiKey="" onApiKeyChange={vi.fn()} />);
    openModal();
    expect(screen.getByText(/记住/)).toBeInTheDocument();
    expect(screen.getByText(/静态窃取/)).toBeInTheDocument();
  });

  it("说明文案更新：免费试用 1 次（每个设备仅一次），无旧的 3小时/5次 表述", () => {
    render(<ApiKeySettings currentApiKey="" onApiKeyChange={vi.fn()} />);
    openModal();
    expect(screen.getByText(/免费试用 1 次（每个设备仅一次）/)).toBeInTheDocument();
    expect(screen.getByText(/使用系统密钥（免费试用 1 次）/)).toBeInTheDocument();
    expect(screen.queryByText(/3小时/)).toBeNull();
    expect(screen.queryByText(/5次/)).toBeNull();
  });

  it("受控 open + notice：外部打开时显示弹窗与提示", () => {
    render(
      <ApiKeySettings
        currentApiKey=""
        onApiKeyChange={vi.fn()}
        open={true}
        onOpenChange={vi.fn()}
        notice="免费试用次数已用完"
      />,
    );
    expect(screen.getByText("API 设置")).toBeInTheDocument();
    expect(screen.getByText("免费试用次数已用完")).toBeInTheDocument();
  });

  it("受控 open 关闭：点击遮罩触发 onOpenChange(false)", () => {
    const onOpenChange = vi.fn();
    render(
      <ApiKeySettings
        currentApiKey=""
        onApiKeyChange={vi.fn()}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );
    // 背景遮罩是弹窗外层的 fixed 遮罩，点击它关闭
    const overlay = document.querySelector(".fixed.inset-0");
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("O6 非安全上下文（HTTP）隐藏「记住 Key」", () => {
  it("crypto.subtle 可用时，该行保留且默认勾选（安全上下文不受影响）", () => {
    render(<ApiKeySettings currentApiKey="" onApiKeyChange={vi.fn()} />);
    openModal();
    expect(screen.getByText(/在本设备记住 Key/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("无 crypto.subtle 时整行隐藏：勾选框与边界说明文案都不渲染", () => {
    withoutSubtle(() => {
      render(<ApiKeySettings currentApiKey="" onApiKeyChange={vi.fn()} />);
      openModal();
      expect(screen.queryByRole("checkbox")).toBeNull();
      expect(screen.queryByText(/在本设备记住 Key/)).toBeNull();
      expect(screen.queryByText(/静态窃取/)).toBeNull();
    });
  });

  it("无 crypto.subtle 时保存携带 remember=false（不再尝试注定失败的加密）", () => {
    withoutSubtle(() => {
      const onChange = vi.fn();
      render(<ApiKeySettings currentApiKey="" onApiKeyChange={onChange} />);
      openModal();
      fireEvent.change(screen.getByPlaceholderText("sk-..."), {
        target: { value: "sk-x" },
      });
      fireEvent.click(screen.getByText("保存"));
      expect(onChange).toHaveBeenCalledWith("sk-x", false);
    });
  });

  it("无 crypto.subtle 时，其余表单项照常可用（隐藏的只有记住 Key）", () => {
    withoutSubtle(() => {
      render(<ApiKeySettings currentApiKey="" onApiKeyChange={vi.fn()} />);
      openModal();
      expect(screen.getByPlaceholderText("sk-...")).toBeInTheDocument();
      expect(screen.getByText("API 设置")).toBeInTheDocument();
      expect(screen.getByText("保存")).toBeInTheDocument();
    });
  });
});

describe("OpenAI 设置", () => {
  it('DeepSeek设置保留模型和Key，教程随服务切换且不混用Key', () => {
    const onKey = vi.fn(), onModel = vi.fn();
    render(<ApiKeySettings currentModel="deepseek-flash" currentApiKey="sk-deepseek" onApiKeyChange={onKey} onModelChange={onModel} />);
    fireEvent.click(screen.getByRole('button', { name: 'API Key 教程' }));
    expect(screen.getByLabelText('DeepSeek API Key')).toHaveValue('sk-deepseek');
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getByRole('heading', { name: '如何配置 DeepSeek API Key' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'DeepSeek 开放平台' })[0]).toHaveAttribute('href', 'https://platform.deepseek.com/');
    fireEvent.change(screen.getByLabelText('AI 服务与模型'), { target: { value: 'deepseek-v4-pro' } });
    expect(screen.getByLabelText('DeepSeek API Key')).toHaveValue('sk-deepseek');
    fireEvent.change(screen.getByLabelText('AI 服务与模型'), { target: { value: 'gpt-5.4-mini' } });
    expect(screen.getByLabelText('OpenAI API Key')).toHaveValue('');
    expect(screen.getByRole('heading', { name: '如何配置 OpenAI API Key' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('AI 服务与模型'), { target: { value: 'deepseek-flash' } });
    fireEvent.change(screen.getByLabelText('DeepSeek API Key'), { target: { value: 'sk-new-deepseek' } });
    fireEvent.click(screen.getByText('保存'));
    expect(onModel).toHaveBeenCalledWith('deepseek-flash');
    expect(onKey).toHaveBeenCalledWith('sk-new-deepseek', true);
    expect(onModel.mock.invocationCallOrder[0]).toBeLessThan(onKey.mock.invocationCallOrder[0]);
  });
  it("保存 GPT 模型并保留掩码 Key", () => {
    const onKey = vi.fn(), onModel = vi.fn();
    render(<ApiKeySettings currentApiKey="" onApiKeyChange={onKey} onModelChange={onModel} />);
    openModal();
    expect(screen.getByLabelText("OpenAI API Key")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("AI 服务与模型")).toHaveValue("gpt-5.4-mini");
    fireEvent.change(screen.getByLabelText("AI 服务与模型"), { target: { value: "gpt-5.4" } });
    fireEvent.change(screen.getByLabelText("OpenAI API Key"), { target: { value: " sk-user " } });
    fireEvent.click(screen.getByText("保存"));
    expect(onModel).toHaveBeenCalledWith("gpt-5.4");
    expect(onKey).toHaveBeenCalledWith("sk-user", true);
  });
});

it("重新打开设置回填最新保存的 Key 和模型", () => {
  const props = { currentApiKey: "", onApiKeyChange: vi.fn() };
  const { rerender } = render(<ApiKeySettings {...props} />);
  rerender(<ApiKeySettings {...props} currentApiKey="sk-restored" currentModel="gpt-5.4" />);
  openModal();
  expect(screen.getByLabelText("OpenAI API Key")).toHaveValue("sk-restored");
  expect(screen.getByLabelText("AI 服务与模型")).toHaveValue("gpt-5.4");
});
