import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  usePagination,
  useRef,
  useEffect,
  isEnterKey,
  isUpKey,
  isDownKey,
  type KeypressEvent,
} from '@inquirer/core';
import { Messages } from '#messages/messages.js';

// ANSI color codes and control sequences
const colors = {
  cyan: (text: string): string => `\x1b[36m${text}\x1b[0m`,
  dim: (text: string): string => `\x1b[2m${text}\x1b[0m`,
  red: (text: string): string => `\x1b[31m${text}\x1b[0m`,
  bold: (text: string): string => `\x1b[1m${text}\x1b[0m`,
};

// ANSI cursor control
const cursor = {
  hide: '\x1b[?25l',
  show: '\x1b[?25h',
};

interface Choice<Value> {
  value: Value;
  label: string;
  disabled?: boolean | string;
}

interface CustomSelectConfig<Value> {
  message: string;
  choices: readonly Choice<Value>[];
  multiple: false;
  pageSize?: number;
  loop?: boolean;
  required?: boolean;
  default?: Value;
  validate?: (items: readonly Value[]) => boolean | string | Promise<string | boolean>;
  theme?: {
    icon?: {
      checked?: string;
      unchecked?: string;
      cursor?: string;
    };
  };
}

interface CustomMultiSelectConfig<Value> {
  message: string;
  choices: readonly Choice<Value>[];
  multiple?: true;
  pageSize?: number;
  loop?: boolean;
  required?: boolean;
  default?: readonly Value[];
  validate?: (items: readonly Value[]) => boolean | string | Promise<string | boolean>;
  theme?: {
    icon?: {
      checked?: string;
      unchecked?: string;
      cursor?: string;
    };
  };
}

type CustomSelectPromptConfig<Value> = CustomSelectConfig<Value> | CustomMultiSelectConfig<Value>;

interface Item<Value> {
  choice: Choice<Value>;
  isChecked: boolean;
}

interface CustomSelectTheme {
  icon: {
    checked: string;
    unchecked: string;
    cursor: string;
  };
}

const customSelectTheme: CustomSelectTheme = {
  icon: {
    checked: '◉',
    unchecked: '◯',
    cursor: '›',
  },
};

function isSelectable<Value>(item: Item<Value>): boolean {
  return item.choice.disabled !== true && typeof item.choice.disabled !== 'string';
}

function toggleChoice<Value>(
  choice: Choice<Value>,
  selectedChoices: ReadonlySet<Choice<Value>>
): Set<Choice<Value>> {
  const newSet = new Set(selectedChoices);
  if (newSet.has(choice)) {
    newSet.delete(choice);
  } else {
    newSet.add(choice);
  }
  return newSet;
}

function selectAll<Value>(items: readonly Item<Value>[]): Set<Choice<Value>> {
  const newSet = new Set<Choice<Value>>();
  items.forEach((item) => {
    if (isSelectable(item)) {
      newSet.add(item.choice);
    }
  });
  return newSet;
}

function deselectAll<Value>(): Set<Choice<Value>> {
  return new Set<Choice<Value>>();
}

export const searchableSelect = createPrompt(
  <Value>(config: CustomSelectPromptConfig<Value>, done: (value: Value[]) => void): string => {
    const multiple = config.multiple !== false;
    const { choices, loop = true, pageSize = 7, required, validate = (): boolean => true } = config;
    const theme = { ...customSelectTheme, ...config.theme };

    const [status, setStatus] = useState<string>('pending');
    const prefix = usePrefix({ status });
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [items, setItems] = useState<readonly Item<Value>[]>(() =>
      choices.map((choice) => ({
        choice,
        isChecked: multiple
          ? config.multiple
            ? (config.default?.includes(choice.value) ?? false)
            : false
          : false,
      }))
    );

    const selectedChoices = useRef<Set<Choice<Value>>>(
      new Set(items.filter((item) => item.isChecked).map((item) => item.choice))
    );

    // Filter items based on search query
    const filteredItems = items.filter((item) =>
      item.choice.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const [active, setActive] = useState<number>(0);
    const [errorMsg, setError] = useState<string | undefined>(undefined);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Initialize cursor position to default value on first render
    useEffect(() => {
      if (!isInitialized && !multiple && !config.multiple && config.default) {
        const defaultValue = config.default;
        const defaultIndex = filteredItems.findIndex((item) => item.choice.value === defaultValue);
        if (defaultIndex >= 0) {
          setActive(defaultIndex);
        }
        setIsInitialized(true);
      }
    }, [isInitialized, multiple, config.multiple, config.default, filteredItems]);

    // Ensure active index is within bounds of filtered items
    if (active >= filteredItems.length && filteredItems.length > 0) {
      setActive(filteredItems.length - 1);
    }

    useKeypress(async (key: KeypressEvent) => {
      if (isEnterKey(key)) {
        // In single-select mode, always select the current active item
        if (!multiple) {
          const selectedItem = filteredItems[active];
          if (selectedItem && isSelectable(selectedItem)) {
            // Store the selection so it shows in the done state
            selectedChoices.current = new Set([selectedItem.choice]);
            setStatus('done');
            done([selectedItem.choice.value]);
            return;
          }
        }

        // Multi-select mode: validate and confirm selection
        const selection = Array.from(selectedChoices.current.values());
        const isValid = await validate([...selection.map((choice) => choice.value)]);

        if (required && selection.length === 0) {
          setError(Messages.errors.selectionRequired);
        } else if (isValid === true) {
          setStatus('done');
          done(selection.map((choice) => choice.value));
        } else if (typeof isValid === 'string') {
          setError(isValid);
        } else {
          setError(Messages.errors.selectionRequired);
        }
      } else if (isUpKey(key) || isDownKey(key)) {
        if (
          loop ||
          (isUpKey(key) && active !== 0) ||
          (isDownKey(key) && active !== filteredItems.length - 1)
        ) {
          const offset = isUpKey(key) ? -1 : 1;
          let next = active;
          do {
            next = (next + offset + filteredItems.length) % filteredItems.length;
          } while (!isSelectable(filteredItems[next]!));

          setActive(next);
        }
      } else if (key.name === 'left' || key.name === 'right') {
        // Prevent left/right arrow keys from doing anything
        return;
      } else if (key.name === 'space') {
        setError(undefined);

        const selectedItem = filteredItems[active];
        if (selectedItem && isSelectable(selectedItem)) {
          if (!multiple) {
            // Single-select mode: select this item and close
            selectedChoices.current = new Set([selectedItem.choice]);
            setStatus('done');
            done([selectedItem.choice.value]);
          } else {
            // Multi-select mode: toggle selection
            selectedChoices.current = toggleChoice(selectedItem.choice, selectedChoices.current);

            setItems(
              items.map((item) =>
                item.choice === selectedItem.choice ? { ...item, isChecked: !item.isChecked } : item
              )
            );
          }
        }
      } else if (key.name === 'a' && key.ctrl && multiple) {
        setError(undefined);

        // Toggle select all/deselect all
        const selectableFilteredItems = filteredItems.filter(isSelectable);
        const allFilteredSelected = selectableFilteredItems.every((item) => item.isChecked);

        if (allFilteredSelected) {
          // Deselect all
          selectedChoices.current = deselectAll();
          setItems(
            items.map((item) => ({
              ...item,
              isChecked: false,
            }))
          );
        } else {
          // Select all filtered items
          const allFilteredChoices = selectableFilteredItems.map((item) => item.choice);
          selectedChoices.current = selectAll(filteredItems);
          setItems(
            items.map((item) =>
              allFilteredChoices.includes(item.choice) ? { ...item, isChecked: true } : item
            )
          );
        }
      } else if (key.name === 'backspace' || key.name === 'delete') {
        if (searchQuery.length > 0) {
          setSearchQuery(searchQuery.slice(0, -1));
          setActive(0);
        }
      } else if (key.name && key.name.length === 1 && !key.ctrl) {
        // Add character to search
        setSearchQuery((searchQuery ?? '') + key.name);
        setActive(0);
      }
    });

    const message = colors.bold(config.message);

    const page = usePagination({
      items: filteredItems,
      active,
      renderItem({
        item,
        isActive,
      }: {
        item: Item<Value>;
        index: number;
        isActive: boolean;
      }): string {
        const color = isActive ? colors.cyan : (x: string): string => x;
        const cursor = isActive ? (theme.icon.cursor ?? '›') : ' ';

        // Show checkboxes only in multiple mode
        const checkbox = multiple
          ? item.isChecked
            ? colors.cyan(theme.icon.checked ?? '◉')
            : (theme.icon.unchecked ?? '◯')
          : '';

        const checkboxSpace = multiple ? ' ' : '';

        if (item.choice.disabled) {
          const disabledLabel =
            typeof item.choice.disabled === 'string' ? item.choice.disabled : Messages.ui.disabled;
          return colors.dim(
            `${cursor}${checkboxSpace}${checkbox}${checkbox ? ' ' : ''}${item.choice.label} ${disabledLabel}`
          );
        }

        return color(
          `${cursor}${checkboxSpace}${checkbox}${checkbox ? ' ' : ''}${item.choice.label}`
        );
      },
      pageSize,
      loop,
    });

    if (status === 'done') {
      const selection = Array.from(selectedChoices.current.values())
        .map((choice) => choice.label)
        .join(', ');

      return `${prefix} ${message} ${colors.cyan(selection)}`;
    }

    const helpTip = multiple
      ? colors.dim(
          '\n' +
            Messages.ui.helpMultiSelect(
              colors.cyan(Messages.ui.navigate),
              colors.cyan(Messages.ui.space),
              colors.cyan(Messages.ui.ctrlA)
            )
        )
      : colors.dim(
          '\n' +
            Messages.ui.helpSingleSelect(
              colors.cyan(Messages.ui.navigate),
              colors.cyan(Messages.ui.space + '/' + Messages.ui.enter)
            )
        );

    const searchIndicator = searchQuery
      ? colors.dim(`\n🔍 ${Messages.ui.searchLabel(colors.cyan(searchQuery))}`)
      : colors.dim(`\n🔍 ${Messages.ui.typeToSearch}`);

    /*const choiceCount =
      filteredItems.length !== items.length
        ? colors.dim(`\n(Showing ${filteredItems.length} of ${items.length})`)
        : '';
        */

    const error = errorMsg ? colors.red(`\n${errorMsg}`) : '';

    return `${cursor.hide}${prefix} ${message}${helpTip}${searchIndicator}\n${page}${error}`;
  }
);

/**
 * Multi-select or single-select prompt with search functionality
 *
 * Key bindings:
 * - Type any character: Filter choices by search
 * - ↑/↓: Navigate through choices
 * - Space: Toggle selection of current choice (multi-select mode)
 * - Ctrl+A: Toggle select all / deselect all (multi-select mode only)
 * - Backspace/Delete: Remove last search character
 * - Enter: Confirm selection
 *
 * @template Value - The type of values being selected
 * @param config - Configuration for the prompt
 * @param config.multiple - Enable multi-select mode (default: true). If false, default should be a single value.
 * @returns Promise resolving to array of selected values
 */
export default function customSearchableSelect<Value>(
  config: CustomSelectConfig<Value>
): Promise<Value[]>;
export default function customSearchableSelect<Value>(
  config: CustomMultiSelectConfig<Value>
): Promise<Value[]>;
export default function customSearchableSelect<Value>(
  config: CustomSelectConfig<Value> | CustomMultiSelectConfig<Value>
): Promise<Value[]> {
  type PromptFunction = <T>(config: CustomSelectPromptConfig<T>) => Promise<T[]>;
  return (searchableSelect as unknown as PromptFunction)(config);
}
