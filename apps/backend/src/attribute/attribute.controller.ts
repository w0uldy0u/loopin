import { Controller, Get } from "@nestjs/common"
import { AttributeService } from "./attribute.service"

@Controller("attribute")
export class AttributeController {
  constructor(private readonly attributeService: AttributeService) {}

  @Get("genre")
  getGenre() {
    return this.attributeService.getGenre()
  }
}
