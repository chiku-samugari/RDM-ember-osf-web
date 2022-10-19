import Component from '@ember/component';
import { tagName } from '@ember-decorators/component';
import { layout } from 'ember-osf-web/decorators/component';
import styles from './styles';
import template from './template';

@tagName('')
@layout(template, styles)
export default class selectedItemAttendees extends Component {
}
