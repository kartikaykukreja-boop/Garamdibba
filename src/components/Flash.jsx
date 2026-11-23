// Shows ?msg= / ?err= feedback after a form posts and redirects back.
// Only known message keys are shown, so links can't inject arbitrary text.
export default function Flash({ params, messages = {} }) {
  if (params?.err) {
    return (
      <p className="app-alert app-alert-error" role="alert">
        {messages[params.err] ?? 'Something went wrong. Please try again.'}
      </p>
    )
  }
  if (params?.msg && messages[params.msg]) {
    return <p className="app-alert app-alert-ok" role="status">{messages[params.msg]}</p>
  }
  return null
}
