<template lang="pug">
	.modal-mask(v-show="show")
		.modal-background(@click="close")
		.modal-wrapper
			.modal-container
				h3 {{ title }}
				p(v-html="descriptionHtml")
				form
					.modal-prompts
						.modal-field(v-for="field in prompts")
							span.modal-field-label {{ field.label }}
							input(v-if="field.type == 'text'", type="text", :placeholder="field.placeholder", v-model="field.retValue", :name="field.label", required)
					.modal-buttons
						template(v-for="button in buttons")
							button.modal-button(@click.prevent="button_submit(button)", type="button") {{ button.label }}
</template>

<script>
	export default {
		name: 'modal',
		data() {
			return {
				show: false,
				title: '',
				description: '',
				buttons: [],
				prompts: [],
				okcb: undefined
			};
		},
		computed: {
			descriptionHtml() {
				return this.description ? this.description.replace(/\n/g,'<br/>') : '';
			}
		},
		methods: {
			init(title, description, buttons) {
				this.title = title;
				this.description = description;
				this.buttons = buttons;
				this.show = true;
			},
			close() {
				if(this.buttons.length == 1) {
					this.show = false;
				}
			},
			button_submit(button) {
				this.show = false;
				if(button.cb) button.cb();
			}
		}
	}
</script>