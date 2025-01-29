import { spawn } from "child_process";
import { EventEmitter } from "events";

// Mock the child_process spawn
jest.mock("child_process");

// Helper to create a mock child process
function createMockChildProcess(exitCode: number = 0, error?: Error) {
  const childProcess = new EventEmitter() as any;
  childProcess.stdout = new EventEmitter();
  childProcess.stderr = new EventEmitter();

  process.nextTick(() => {
    if (error) {
      childProcess.emit("error", error);
    } else {
      childProcess.emit("close", exitCode);
    }
  });

  return childProcess;
}

describe("Pipet CLI", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    processExitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(
        (code?: number | string | null) => undefined as never
      );
    (spawn as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("parseOptions", () => {
    test("should throw error when no command separator is provided", () => {
      const args = ["--on-success", "Success!", "--on-error", "Error!"];

      const { parseOptions } = jest.requireActual("../src/index");

      expect(() => parseOptions(args)).toThrow(
        'Missing command separator "--"'
      );
    });

    test("should throw error when no command is specified after separator", () => {
      const args = ["--on-success", "Success!", "--on-error", "Error!", "--"];

      const { parseOptions } = jest.requireActual("../src/index");

      expect(() => parseOptions(args)).toThrow("No command specified");
    });

    test("should throw error when --on-success is missing", () => {
      const args = ["--on-error", "Error!", "--", "echo", "test"];

      const { parseOptions } = jest.requireActual("../src/index");

      expect(() => parseOptions(args)).toThrow("--on-success is required");
    });

    test("should throw error when --on-error is missing", () => {
      const args = ["--on-success", "Success!", "--", "echo", "test"];

      const { parseOptions } = jest.requireActual("../src/index");

      expect(() => parseOptions(args)).toThrow("--on-error is required");
    });

    test("should correctly parse valid arguments", () => {
      const args = [
        "--on-success",
        "Success!",
        "--on-error",
        "Error!",
        "--hide",
        "--",
        "echo",
        "test",
      ];

      const { parseOptions } = jest.requireActual("../src/index");
      const options = parseOptions(args);

      expect(options).toEqual({
        onSuccess: "Success!",
        onError: "Error!",
        hide: true,
        command: ["echo", "test"],
      });
    });
  });

  describe("runCommand", () => {
    test("should execute command and handle success", async () => {
      const mockChildProcess = createMockChildProcess(0);
      (spawn as jest.Mock).mockReturnValue(mockChildProcess);

      const { runCommand } = jest.requireActual("../src/index");

      await runCommand({
        command: ["echo", "test"],
        onSuccess: "Success!",
        onError: "Error!",
        hide: false,
      });

      expect(spawn).toHaveBeenCalledWith("echo", ["test"], expect.any(Object));
      expect(consoleLogSpy).toHaveBeenCalledWith("Success!");
    });

    test("should handle command failure", async () => {
      const mockChildProcess = createMockChildProcess(1);
      (spawn as jest.Mock).mockReturnValue(mockChildProcess);

      const { runCommand } = jest.requireActual("../src/index");

      await expect(
        runCommand({
          command: ["invalid-command"],
          onSuccess: "Success!",
          onError: "Error!",
          hide: false,
        })
      ).rejects.toThrow("Command failed with exit code 1");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error!");
    });

    test("should handle spawn errors", async () => {
      const error = new Error("Spawn error");
      const mockChildProcess = createMockChildProcess(0, error);
      (spawn as jest.Mock).mockReturnValue(mockChildProcess);

      const { runCommand } = jest.requireActual("../src/index");

      await expect(
        runCommand({
          command: ["echo", "test"],
          onSuccess: "Success!",
          onError: "Error!",
          hide: false,
        })
      ).rejects.toThrow("Spawn error");
    });

    test("should handle output when hide is false", async () => {
      const mockChildProcess = createMockChildProcess(0);
      (spawn as jest.Mock).mockReturnValue(mockChildProcess);

      const { runCommand } = jest.requireActual("../src/index");

      const runPromise = runCommand({
        command: ["echo", "test"],
        onSuccess: "Success!",
        onError: "Error!",
        hide: false,
      });

      // Simulate stdout data
      mockChildProcess.stdout.emit("data", Buffer.from("test output"));

      await runPromise;

      expect(spawn).toHaveBeenCalledWith("echo", ["test"], {
        stdio: ["inherit", "inherit", "inherit"],
        shell: true,
      });
    });

    test("should handle output when hide is true", async () => {
      const mockChildProcess = createMockChildProcess(0);
      (spawn as jest.Mock).mockReturnValue(mockChildProcess);

      const { runCommand } = jest.requireActual("../src/index");

      const runPromise = runCommand({
        command: ["echo", "test"],
        onSuccess: "Success!",
        onError: "Error!",
        hide: true,
      });

      // Simulate stdout data
      mockChildProcess.stdout.emit("data", Buffer.from("test output"));

      await runPromise;

      expect(spawn).toHaveBeenCalledWith("echo", ["test"], {
        stdio: ["inherit", "pipe", "pipe"],
        shell: true,
      });
    });
  });
});
