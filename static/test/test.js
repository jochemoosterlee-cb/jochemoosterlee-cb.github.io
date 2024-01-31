function myFunction() {
  waitingTime = 'WAITING_TIME_QUIET'|'WAITING_TIME_AVERAGE'|'WAITING_TIME_BUSY'
  const WaitingTimeInfo = () => {
    const [ waitingTime, setWaitingTime ] = useState<WaitingTime | null>(null)
    const [ isOpen, setOpen ] = useState<boolean | null>(null)
    const getOpeningHoursAndTime = async () => {
      const authKey = process.env.NEXT_PUBLIC_IDREG_END_USER_PRODUCT_KEY || ''
      const requestHeaders = new Headers()
      requestHeaders.set('PublicAuth', authKey)
      const res = await fetch(
        '/api/natural-person-registrations/opening-hours', {
          method: 'GET',
          headers: requestHeaders
        }
      )
      const json = await res.json()
      setOpen(json.isOpen)
      if (isOpen) {
        const res = await fetch(
          '/api/natural-person-registrations/waiting-time', {
            method: 'GET',
            headers: requestHeaders
          }
        )
        const json = await res.json()
        setWaitingTime(json.time)
      }
    }
    getOpeningHoursAndTime().catch(console.error)
    }
  console.log(waitingTime)
}
