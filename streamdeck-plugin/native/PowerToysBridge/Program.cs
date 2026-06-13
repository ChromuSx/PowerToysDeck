using System.Runtime.InteropServices;
using System.Text.Json;

internal static class Program
{
    private const uint KeyEventFKeyUp = 0x0002;
    private const uint KeyEventFUnicode = 0x0004;
    private const byte VkControl = 0x11;
    private const byte VkShift = 0x10;
    private const byte VkAlt = 0x12;
    private const byte VkLWin = 0x5B;

    private static readonly Dictionary<string, string> KnownEvents = new(StringComparer.OrdinalIgnoreCase)
    {
        ["PowerToys Run"] = "Local\\PowerToysRunInvokeEvent-30f26ad7-d36d-4c0e-ab02-68bb5ff3c4ab",
        ["Command Palette"] = "Local\\PowerToysCmdPal-ShowEvent-62336fcd-8611-4023-9b30-091a6af4cc5a",
        ["Advanced Paste"] = "Local\\PowerToys_AdvancedPaste_ShowUI",
        ["Color Picker"] = "Local\\ShowColorPickerEvent-8c46be2a-3e05-4186-b56b-4ae986ef2525",
        ["Environment Variables"] = "Local\\PowerToysEnvironmentVariables-ShowEnvironmentVariablesEvent-1021f616-e951-4d64-b231-a8f972159978",
        ["FancyZones Editor"] = "Local\\FancyZones-ToggleEditorEvent-1e174338-06a3-472b-874d-073b21c62f14",
        ["Text Extractor"] = "Local\\PowerOCREvent-dc864e06-e1af-4ecc-9078-f98bee745e3a",
        ["Shortcut Guide"] = "Local\\ShortcutGuide-TriggerEvent-d4275ad3-2531-4d19-9252-c0becbd9b496",
        ["Measure Tool"] = "Local\\MeasureToolEvent-3d46745f-09b3-4671-a577-236be7abd199",
        ["Registry Preview"] = "Local\\RegistryPreviewEvent-4C559468-F75A-4E7F-BC4F-9C9688316687",
        ["Always On Top"] = "Local\\AlwaysOnTopPinEvent-892e0aa2-cfa8-4cc4-b196-ddeb32314ce8",
        ["Find My Mouse"] = "Local\\FindMyMouseTriggerEvent-5a9dc5f4-1c74-4f2f-a66f-1b9b6a2f9b23",
        ["Mouse Highlighter"] = "Local\\MouseHighlighterTriggerEvent-1e3c9c3d-3fdf-4f9a-9a52-31c9b3c3a8f4",
        ["Mouse Crosshairs"] = "Local\\MouseCrosshairsTriggerEvent-0d4c7f92-0a5c-4f5c-b64b-8a2a2f7e0b21",
        ["Cursor Wrap"] = "Local\\CursorWrapTriggerEvent-1f8452b5-4e6e-45b3-8b09-13f14a5900c9",
        ["Peek"] = "Local\\ShowPeekEvent",
        ["Workspaces"] = "Local\\Workspaces-LaunchEditorEvent-a55ff427-cf62-4994-a2cd-9f72139296bf",
        ["Workspaces Hotkey"] = "Local\\PowerToys-Workspaces-HotkeyEvent-2625C3C8-BAC9-4DB3-BCD6-3B4391A26FD0",
        ["PowerDisplay"] = "Local\\PowerToysPowerDisplay-ToggleEvent-5f1a9c3e-7d2b-4e8f-9a6c-3b5d7e9f1a2c",
        ["Light Switch"] = "Local\\PowerToys-LightSwitch-ToggleEvent-d8dc2f29-8c94-4ca1-8c5f-3e2b1e3c4f5a",
        ["Keyboard Manager"] = "Local\\PowerToysOpenNewKeyboardManagerEvent-9c1d2e3f-4b5a-6c7d-8e9f-0a1b2c3d4e5f",
        ["Mouse Without Borders Reconnect"] = "Local\\PowerToysMWB-ReconnectEvent-b8d7c6a5-f4e3-2b1c-0a9d-8e7f6a5b4c3d",
        ["Mouse Without Borders Toggle"] = "Local\\PowerToysMWB-ToggleEasyMouseEvent-a9c8d7b6-e5f4-3c2a-1b0d-9e8f7a6b5c4d",
        ["Crop And Lock Reparent"] = "Local\\PowerToysCropAndLockReparentEvent-6060860a-76a1-44e8-8d0e-6355785e9c36",
        ["Crop And Lock Thumbnail"] = "Local\\PowerToysCropAndLockThumbnailEvent-1637be50-da72-46b2-9220-b32b206b2434",
        ["Crop And Lock Screenshot"] = "Local\\PowerToysCropAndLockScreenshotEvent-ff077ab2-8360-4bd1-864a-637389d35593",
        ["ZoomIt Zoom"] = "Local\\PowerToysZoomIt-ZoomEvent-1e4190d7-94bc-4ad5-adc0-9a8fd07cb393",
        ["ZoomIt Draw"] = "Local\\PowerToysZoomIt-DrawEvent-56338997-404d-4549-bd9a-d132b6766975",
        ["ZoomIt Break"] = "Local\\PowerToysZoomIt-BreakEvent-17f2e63c-4c56-41dd-90a0-2d12f9f50c6b",
        ["ZoomIt Live Zoom"] = "Local\\PowerToysZoomIt-LiveZoomEvent-390bf0c7-616f-47dc-bafe-a2d228add20d",
        ["ZoomIt Snip"] = "Local\\PowerToysZoomIt-SnipEvent-2fd9c211-436d-4f17-a902-2528aaae3e30",
        ["ZoomIt Record"] = "Local\\PowerToysZoomIt-RecordEvent-74539344-eaad-4711-8e83-23946e424512",
    };

    [DllImport("user32.dll")]
    private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    [StructLayout(LayoutKind.Sequential)]
    private struct INPUT
    {
        public uint type;
        public InputUnion U;
    }

    [StructLayout(LayoutKind.Explicit)]
    private struct InputUnion
    {
        [FieldOffset(0)]
        public KEYBDINPUT ki;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct KEYBDINPUT
    {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    private sealed record HotkeyPayload(bool Win, bool Ctrl, bool Alt, bool Shift, int Code, string? Key);

    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length == 0)
        {
            Console.Error.WriteLine("Usage: PowerToysBridge <list|signal|hotkey|text> [value]");
            return 64;
        }

        try
        {
            return args[0].ToLowerInvariant() switch
            {
                "list" => ListEvents(),
                "signal" => args.Length >= 2 ? SignalEvent(args[1]) : MissingValue("signal"),
                "hotkey" => args.Length >= 2 ? SendHotkey(args[1]) : MissingValue("hotkey"),
                "text" => args.Length >= 2 ? SendText(args[1]) : MissingValue("text"),
                _ => UnknownCommand(args[0]),
            };
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"ERROR:{ex.GetType().Name}:{ex.Message}");
            return 99;
        }
    }

    private static int ListEvents()
    {
        foreach (var item in KnownEvents.OrderBy(k => k.Key))
        {
            Console.WriteLine($"{item.Key}\t{item.Value}");
        }

        return 0;
    }

    private static int SignalEvent(string eventName)
    {
        if (KnownEvents.TryGetValue(eventName, out var knownEventName))
        {
            eventName = knownEventName;
        }

        try
        {
            using var handle = EventWaitHandle.OpenExisting(eventName);
            handle.Set();
            Console.WriteLine($"SUCCESS:Signal:{eventName}");
            return 0;
        }
        catch (WaitHandleCannotBeOpenedException)
        {
            Console.Error.WriteLine($"ERROR:EventNotFound:{eventName}");
            return 2;
        }
    }

    private static int SendHotkey(string value)
    {
        var hotkey = ParseHotkey(value);
        if (hotkey.Code <= 0 && !hotkey.Win && !hotkey.Ctrl && !hotkey.Alt && !hotkey.Shift)
        {
            Console.Error.WriteLine("ERROR:InvalidHotkey:Missing key code");
            return 3;
        }

        var modifiers = new List<byte>();
        if (hotkey.Win) modifiers.Add(VkLWin);
        if (hotkey.Ctrl) modifiers.Add(VkControl);
        if (hotkey.Alt) modifiers.Add(VkAlt);
        if (hotkey.Shift) modifiers.Add(VkShift);

        Thread.Sleep(80);
        foreach (var modifier in modifiers)
        {
            keybd_event(modifier, 0, 0, UIntPtr.Zero);
        }

        if (hotkey.Code > 0)
        {
            keybd_event((byte)hotkey.Code, 0, 0, UIntPtr.Zero);
            Thread.Sleep(50);
            keybd_event((byte)hotkey.Code, 0, KeyEventFKeyUp, UIntPtr.Zero);
        }
        else
        {
            Thread.Sleep(50);
        }

        for (var i = modifiers.Count - 1; i >= 0; i--)
        {
            keybd_event(modifiers[i], 0, KeyEventFKeyUp, UIntPtr.Zero);
        }

        Console.WriteLine($"SUCCESS:Hotkey:{DescribeHotkey(hotkey)}");
        return 0;
    }

    private static HotkeyPayload ParseHotkey(string value)
    {
        value = value.Trim();
        if (value.StartsWith('{'))
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var hotkey = JsonSerializer.Deserialize<HotkeyPayload>(value, options);
            if (hotkey is null)
            {
                throw new ArgumentException("Hotkey JSON could not be parsed.");
            }

            if (hotkey.Code <= 0 && !string.IsNullOrWhiteSpace(hotkey.Key))
            {
                hotkey = hotkey with { Code = ParseVirtualKey(hotkey.Key) };
            }

            return hotkey;
        }

        var win = false;
        var ctrl = false;
        var alt = false;
        var shift = false;
        var code = 0;

        foreach (var part in value.Split('+', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            switch (part.ToLowerInvariant())
            {
                case "win":
                case "windows":
                    win = true;
                    break;
                case "ctrl":
                case "control":
                    ctrl = true;
                    break;
                case "alt":
                    alt = true;
                    break;
                case "shift":
                    shift = true;
                    break;
                default:
                    code = ParseVirtualKey(part);
                    break;
            }
        }

        return new HotkeyPayload(win, ctrl, alt, shift, code, null);
    }

    private static int ParseVirtualKey(string key)
    {
        if (key.Length == 1 && char.IsLetterOrDigit(key[0]))
        {
            return char.ToUpperInvariant(key[0]);
        }

        if (key.StartsWith("0x", StringComparison.OrdinalIgnoreCase)
            && int.TryParse(key.AsSpan(2), System.Globalization.NumberStyles.HexNumber, null, out var hexCode))
        {
            return hexCode;
        }

        if (key.Length > 1 && key[0] is 'F' or 'f' && int.TryParse(key.AsSpan(1), out var functionNumber) && functionNumber is >= 1 and <= 24)
        {
            return 0x70 + functionNumber - 1;
        }

        return key.ToLowerInvariant() switch
        {
            "space" => 0x20,
            "tab" => 0x09,
            "enter" or "return" => 0x0D,
            "esc" or "escape" => 0x1B,
            "backspace" => 0x08,
            "delete" or "del" => 0x2E,
            "home" => 0x24,
            "end" => 0x23,
            "pageup" or "pgup" => 0x21,
            "pagedown" or "pgdn" => 0x22,
            "up" => 0x26,
            "down" => 0x28,
            "left" => 0x25,
            "right" => 0x27,
            "oem1" or ";" => 0xBA,
            "oemplus" or "=" => 0xBB,
            "oemcomma" or "," => 0xBC,
            "oemminus" or "-" => 0xBD,
            "oemperiod" or "." => 0xBE,
            "oem2" or "/" => 0xBF,
            "oem3" or "`" => 0xC0,
            "oem4" or "[" => 0xDB,
            "oem5" or "\\" => 0xDC,
            "oem6" or "]" => 0xDD,
            "oem7" or "'" => 0xDE,
            _ => throw new ArgumentException($"Unknown key: {key}"),
        };
    }

    private static int SendText(string value)
    {
        Thread.Sleep(160);
        foreach (var ch in value)
        {
            var inputs = new[]
            {
                new INPUT
                {
                    type = 1,
                    U = new InputUnion
                    {
                        ki = new KEYBDINPUT { wScan = ch, dwFlags = KeyEventFUnicode },
                    },
                },
                new INPUT
                {
                    type = 1,
                    U = new InputUnion
                    {
                        ki = new KEYBDINPUT { wScan = ch, dwFlags = KeyEventFUnicode | KeyEventFKeyUp },
                    },
                },
            };

            var sent = SendInput((uint)inputs.Length, inputs, Marshal.SizeOf<INPUT>());
            if (sent != inputs.Length)
            {
                Console.Error.WriteLine($"ERROR:SendInput:{Marshal.GetLastWin32Error()}");
                return 4;
            }
        }

        Console.WriteLine("SUCCESS:Text");
        return 0;
    }

    private static string DescribeHotkey(HotkeyPayload hotkey)
    {
        var parts = new List<string>();
        if (hotkey.Win) parts.Add("Win");
        if (hotkey.Ctrl) parts.Add("Ctrl");
        if (hotkey.Alt) parts.Add("Alt");
        if (hotkey.Shift) parts.Add("Shift");
        if (hotkey.Code > 0 || !string.IsNullOrWhiteSpace(hotkey.Key))
        {
            parts.Add(hotkey.Key ?? hotkey.Code.ToString(System.Globalization.CultureInfo.InvariantCulture));
        }

        return string.Join("+", parts);
    }

    private static int MissingValue(string command)
    {
        Console.Error.WriteLine($"ERROR:MissingValue:{command}");
        return 64;
    }

    private static int UnknownCommand(string command)
    {
        Console.Error.WriteLine($"ERROR:UnknownCommand:{command}");
        return 64;
    }
}
