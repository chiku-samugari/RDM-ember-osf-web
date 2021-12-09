import moment from 'moment';

/**
 *
 * @param dateTime: reference time used to calculate relative time. Should be in the past.
 */
export default function formattedTimeSince(dateTime: Date) {
    const now = moment();
    let then = moment(dateTime);
    then = then > now ? now : then;
    return then.fromNow();
}
