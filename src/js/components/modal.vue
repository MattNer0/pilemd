<template lang="pug">
	.modal-mask(v-show="show")
		.modal-background(@click="close")
		.modal-wrapper
			.modal-container
				h3 {{ title }}
				p(v-html="descriptionHtml")
				form(@submit.prevent="button_submit(buttons[0])")
					.modal-prompts
						.modal-field(v-for="field in prompts")
							span.modal-field-label {{ field.label }}
							input(v-if="field.type == 'text'", type="text", v-model="field.retValue", :name="field.name")
							input(v-else-if="field.type == 'password'", type="password", v-model="field.retValue", :name="field.label")
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
			},
			promptsObject() {
				var obj = {};
				for(var i = 0; i < this.prompts.length; i++) {
					obj[this.prompts[i].name] = this.prompts[i].retValue;
				}
				return obj;
			}
		},
		methods: {
			init(title, description, buttons, prompts) {
				this.title = title;
				this.description = description;
				this.buttons = buttons;
				this.prompts = prompts;
				this.show = true;
			},
			close() {
				if(this.buttons.length == 1 && this.prompts.length == 0) {
					this.show = false;
				}
			},
			button_submit(button) {
				if(button.cancel) {
					this.show = false;
				} else {
					for(var i = 0; i < this.prompts.length; i++) {
						if(this.prompts[i].required && !this.prompts[i].retValue) return false;
					}
					this.show = false;
				}
				
				if(button.cb) button.cb(this.promptsObject);
			}
		}
	}
</script>