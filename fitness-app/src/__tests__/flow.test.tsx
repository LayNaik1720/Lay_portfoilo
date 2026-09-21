import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

const renderApp = (route = '/') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )

let consoleErrors: string[] = []

beforeEach(() => {
  consoleErrors = []
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = args.map((arg) => String(arg)).join(' ')
    // recharts + jsdom zero-size containers are noise, not app errors
    if (message.includes('ResizeObserver') || message.includes('The width(0)')) return
    consoleErrors.push(message)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** both the sidebar and the mobile bar render the same links in jsdom */
const navLink = (name: string | RegExp) => screen.getAllByRole('link', { name })[0]

async function loginAsDemo(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: /welcome back/i })
  await user.click(screen.getByRole('button', { name: /explore the demo account/i }))
  await screen.findByRole('heading', { name: /good (morning|afternoon|evening)/i }, { timeout: 4000 })
}

describe('authentication', () => {
  it('logs in with the demo account and renders the dashboard', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await loginAsDemo(user)

    expect(screen.getByText(/today’s goal/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start workout/i })).toBeInTheDocument()
    expect(consoleErrors).toEqual([])
  })

  it('validates the login form before submitting', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await user.click(await screen.findByRole('button', { name: /^login$/i }))
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument()
  })

  it('walks a new user through register → onboarding → dashboard', async () => {
    const user = userEvent.setup()
    renderApp('/register')

    await user.type(await screen.findByLabelText(/full name/i), 'Jordan Rivers')
    await user.type(screen.getByLabelText(/^email$/i), 'jordan@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass1!')
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass1!')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // onboarding step 1
    await screen.findByRole('heading', { name: /tell us about you/i }, { timeout: 4000 })
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // goal
    await screen.findByRole('heading', { name: /what’s your main goal/i })
    await user.click(screen.getByRole('button', { name: /build muscle/i }))
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // activity
    await screen.findByRole('heading', { name: /how active are you/i })
    await user.click(screen.getByRole('button', { name: /moderately active/i }))
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // experience
    await screen.findByRole('heading', { name: /training experience/i })
    await user.click(screen.getByRole('button', { name: /intermediate/i }))
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // preference + finish
    await screen.findByRole('heading', { name: /where do you like to train/i })
    await user.click(screen.getByRole('button', { name: /^gym/i }))
    await user.click(screen.getByRole('button', { name: /finish setup/i }))

    await screen.findByRole('heading', { name: /you’re all set/i }, { timeout: 4000 })
    await user.click(screen.getByRole('button', { name: /go to my dashboard/i }))

    const greeting = await screen.findByRole('heading', { name: /good (morning|afternoon|evening), jordan/i }, { timeout: 5000 })
    expect(greeting).toBeInTheDocument()
    expect(consoleErrors).toEqual([])
  })
})

describe('core training flow', () => {
  it('finds a workout, runs it and records the session in history', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await loginAsDemo(user)

    // open the workout library from the sidebar
    await user.click(navLink('Workouts'))
    await screen.findByRole('heading', { name: 'Workouts' })

    // search narrows the list
    const search = screen.getByPlaceholderText(/search by name, muscle, equipment/i)
    await user.type(search, 'full body strength')
    const card = await screen.findByRole('link', { name: /full body strength/i })
    await user.click(card)

    await screen.findByRole('heading', { name: 'Full Body Strength' })
    await user.click(screen.getByRole('button', { name: /start workout/i }))

    // player
    const completeSet = await screen.findByRole('button', { name: /complete set/i }, { timeout: 8000 })
    await user.click(completeSet)
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /finish/i }))

    // confirmation dialog then summary
    await user.click(await screen.findByRole('button', { name: /finish & save/i }))
    await screen.findByRole('heading', { name: /workout complete/i }, { timeout: 4000 })
    await user.click(screen.getByRole('button', { name: /back to dashboard/i }))

    // history reflects the session
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'History' }).length).toBeGreaterThan(0))
    await user.click(navLink('History'))
    await screen.findByRole('heading', { name: /workout history/i })
    await screen.findByRole('heading', { name: /workout history/i })
    expect(screen.getAllByText(/full body strength/i).length).toBeGreaterThan(0)
    expect(consoleErrors).toEqual([])
  })
})

describe('workout cards', () => {
  it('starts a workout straight from the library card', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await loginAsDemo(user)

    await user.click(navLink('Workouts'))
    await screen.findByRole('heading', { name: 'Workouts' })
    const startButtons = await screen.findAllByRole('button', { name: /^start workout$/i })
    await user.click(startButtons[0])

    expect(await screen.findByRole('button', { name: /complete set/i }, { timeout: 8000 })).toBeInTheDocument()
    expect(consoleErrors).toEqual([])
  })
})

describe('trackers', () => {
  it('logs water, meals and goals from the quick actions', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await loginAsDemo(user)

    /* ---- water ---- */
    await user.click(navLink('Water'))
    await screen.findByRole('heading', { name: /water tracker/i })
    const before = screen.getByText(/% hydrated/i).textContent
    await user.click(screen.getAllByRole('button', { name: /500ml/i })[0])
    await waitFor(() => expect(screen.getByText(/% hydrated/i).textContent).not.toBe(before))

    /* ---- nutrition ---- */
    await user.click(navLink('Nutrition'))
    await screen.findByRole('heading', { name: 'Nutrition' })
    await user.click(screen.getAllByRole('button', { name: /^add meal$/i })[0])
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/food name/i), 'Test Bowl')
    await user.type(within(dialog).getByLabelText(/calories/i), '520')
    await user.click(within(dialog).getByRole('button', { name: /^add meal$/i }))
    expect(await screen.findByText('Test Bowl')).toBeInTheDocument()

    /* ---- goals ---- */
    await user.click(navLink('Goals'))
    await screen.findByRole('heading', { name: 'Goals' })
    await user.click(screen.getByRole('button', { name: /walk 10,000 steps daily/i }))
    await user.click(await screen.findByRole('button', { name: /create goal/i }))
    await waitFor(() => expect(screen.getAllByText(/walk 10,000 steps daily/i).length).toBeGreaterThan(0))
    expect(consoleErrors).toEqual([])
  })

  it('updates body measurements and recalculates BMI', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await loginAsDemo(user)

    await user.click(navLink('Body Tracker'))
    await screen.findByRole('heading', { name: /body tracker/i })
    await user.click(screen.getByRole('button', { name: /add measurement/i }))
    const dialog = await screen.findByRole('dialog')
    const weightField = within(dialog).getByLabelText(/^weight/i)
    await user.clear(weightField)
    await user.type(weightField, '71.5')
    await user.click(within(dialog).getByRole('button', { name: /save measurement/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getAllByText(/71.5 kg/).length).toBeGreaterThan(0)
  })
})

describe('profile & navigation', () => {
  it('renames the user and reflects it across the app', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await loginAsDemo(user)

    await user.click(navLink('Profile'))
    await screen.findByRole('heading', { name: 'Profile' })
    const nameField = screen.getByLabelText(/full name/i)
    await user.clear(nameField)
    await user.type(nameField, 'Sam Rivera')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await user.click(navLink('Dashboard'))
    expect(await screen.findByRole('heading', { name: /good (morning|afternoon|evening), sam/i })).toBeInTheDocument()
  })

  it('toggles the theme from the topbar', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await loginAsDemo(user)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    await user.click(screen.getByRole('button', { name: /switch to light theme/i }))
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(false))
  })

  it('renders a 404 page for unknown routes', async () => {
    renderApp('/definitely-not-a-page')
    expect(await screen.findByRole('heading', { name: /404/i })).toBeInTheDocument()
  })

  it('shows empty states for a brand new account', async () => {
    const user = userEvent.setup()
    renderApp('/register')
    await user.type(await screen.findByLabelText(/full name/i), 'New Lifter')
    await user.type(screen.getByLabelText(/^email$/i), 'new@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass1!')
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass1!')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await screen.findByRole('heading', { name: /tell us about you/i }, { timeout: 4000 })
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await screen.findByRole('heading', { name: /what’s your main goal/i })
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await screen.findByRole('heading', { name: /how active are you/i })
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await screen.findByRole('heading', { name: /training experience/i })
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await screen.findByRole('heading', { name: /where do you like to train/i })

    // start from a clean slate (no sample history)
    const sampleToggle = screen.getByRole('switch', { name: /populate my account with sample activity/i })
    await user.click(sampleToggle)
    await user.click(screen.getByRole('button', { name: /finish setup/i }))
    await user.click(await screen.findByRole('button', { name: /go to my dashboard/i }, { timeout: 4000 }))

    expect(await screen.findByText(/no workouts completed today/i, undefined, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start your first workout/i })).toBeInTheDocument()
  })
})
