import { LogDemoPage } from '../pages/LogDemoPage'
import { PlannerPage } from '../pages/PlannerPage'

// Two pages don't need a router: /demo/log shows the FMCSA golden example.
export default function App() {
  if (window.location.pathname.replace(/\/$/, '') === '/demo/log') return <LogDemoPage />
  return <PlannerPage />
}
