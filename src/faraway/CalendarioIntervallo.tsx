// Calendario per scegliere un intervallo «dal … al …» (RangeCalendar di react-aria-components, in italiano,
// settimana da lunedì). Si toccano due giorni; lo stesso giorno due volte vale come un giorno solo.
import { parseDate, type CalendarDate } from '@internationalized/date'
import { Button, CalendarCell, CalendarGrid, CalendarGridBody, CalendarGridHeader, CalendarHeaderCell, Heading, I18nProvider, RangeCalendar } from 'react-aria-components'
import { Sv } from './icons'

export interface Intervallo {
  /** «aaaa-mm-gg» */
  dal: string
  al: string
}

export function CalendarioIntervallo({ value, onChange, mese }: { value: Intervallo | null; onChange: (v: Intervallo) => void; /** mese da mostrare se non c'è ancora una scelta («aaaa-mm-gg») */ mese?: string }) {
  const v = value ? { start: parseDate(value.dal), end: parseDate(value.al) } : null
  return (
    <I18nProvider locale="it-IT">
      <RangeCalendar
        className="fa-cal"
        aria-label="Date delle spese"
        value={v}
        defaultFocusedValue={v?.start ?? (mese ? parseDate(mese) : undefined)}
        firstDayOfWeek="mon"
        onChange={(r: { start: CalendarDate; end: CalendarDate }) => onChange({ dal: r.start.toString(), al: r.end.toString() })}
      >
        <header className="fa-cal-h">
          <Button slot="previous" className="fa-cal-nav" aria-label="Mese precedente">
            <Sv name="chevr" size={20} className="fa-cal-prev" />
          </Button>
          <Heading className="fa-cal-t" />
          <Button slot="next" className="fa-cal-nav" aria-label="Mese successivo">
            <Sv name="chevr" size={20} />
          </Button>
        </header>
        <CalendarGrid className="fa-cal-g" weekdayStyle="short">
          <CalendarGridHeader>{(giorno) => <CalendarHeaderCell className="fa-cal-wd">{giorno}</CalendarHeaderCell>}</CalendarGridHeader>
          <CalendarGridBody>{(date) => <CalendarCell date={date} className="fa-cal-c" />}</CalendarGridBody>
        </CalendarGrid>
      </RangeCalendar>
    </I18nProvider>
  )
}
