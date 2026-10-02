interface AlertProps {
  title: string
  message: string
}

export function ErrorAlert({ title, message }: AlertProps) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-semibold">{title}</p>
      <p className="mt-0.5">{message}</p>
    </div>
  )
}
