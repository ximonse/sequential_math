const NUMBER_KEY_LAYOUT = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', ',', '±']

export default function NumberKeys({ onKey, disabled = false, buttonClassName = '', labelPrefix = '' }) {
  return NUMBER_KEY_LAYOUT.map(key => <button key={key} type="button"
    aria-label={labelPrefix ? `${labelPrefix} ${key}` : undefined} disabled={disabled} onClick={() => onKey(key)}
    className={buttonClassName}>{key}</button>)
}
