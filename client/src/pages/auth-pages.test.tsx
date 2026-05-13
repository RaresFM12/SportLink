import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

const authMock = {
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  hasPermission: vi.fn(),
  user: null,
  loading: false,
  isAdmin: false,
};

vi.mock("../context/AuthContext", () => ({
  useAuth: () => authMock,
}));

function renderPage(ui: ReactNode) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe("auth pages", () => {
  beforeEach(() => {
    authMock.login.mockReset();
    authMock.register.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("submits login credentials through the auth context", async () => {
    authMock.login.mockResolvedValue(undefined);

    renderPage(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "rares" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "rares123" } });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(authMock.login).toHaveBeenCalledWith("rares", "rares123");
    });
  });

  it("shows the backend login error when credentials are rejected", async () => {
    authMock.login.mockRejectedValue(new Error("Invalid username or password."));

    renderPage(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "rares" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    expect(await screen.findByText("Invalid username or password.")).toBeVisible();
  });

  it("prevents registration when passwords do not match", async () => {
    renderPage(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "rares" } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Rares Popescu" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(await screen.findByText("Passwords do not match.")).toBeVisible();
    expect(authMock.register).not.toHaveBeenCalled();
  });

  it("submits registration and creates a logged-in USER session", async () => {
    authMock.register.mockResolvedValue(undefined);

    renderPage(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "newuser" } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "New User" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(authMock.register).toHaveBeenCalledWith({
        username: "newuser",
        displayName: "New User",
        password: "secret123",
      });
    });
  });
});
