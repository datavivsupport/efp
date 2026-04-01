import SearchableSelect from "../SearchableSelect/SearchableSelect";

const TermsOfShipmentSelect = ({ placeholder = "Select Terms of Shipment", ...rest }) => (
  <SearchableSelect
    url="/accounts/master/EFPTermsOfShipment/"
    placeholder={placeholder}
    {...rest}
  />
);

export default TermsOfShipmentSelect;
