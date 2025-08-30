// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title HydroCredToken
 * @dev ERC721 token representing green hydrogen credits (H2 tokens)
 * Each token represents 1 kg of certified green hydrogen production
 * Implements hierarchical role system: Main Admin → Country Admin → State Admin → City Admin (Certifier)
 */
contract HydroCredToken is ERC721, ERC721Enumerable, AccessControl, Pausable {
    // Role definitions
    bytes32 public constant COUNTRY_ADMIN_ROLE = keccak256("COUNTRY_ADMIN_ROLE");
    bytes32 public constant STATE_ADMIN_ROLE = keccak256("STATE_ADMIN_ROLE");
    bytes32 public constant CITY_ADMIN_ROLE = keccak256("CITY_ADMIN_ROLE");
    bytes32 public constant PRODUCER_ROLE = keccak256("PRODUCER_ROLE");
    bytes32 public constant BUYER_ROLE = keccak256("BUYER_ROLE");
    
    // Geographic mappings
    mapping(address => uint256) public adminCountries;
    mapping(address => uint256) public adminStates;
    mapping(address => uint256) public adminCities;
    mapping(address => uint256) public producerCities;
    
    uint256 private _nextTokenId = 1;
    uint256 public nextCountryId = 1;
    uint256 public nextStateId = 1;
    uint256 public nextCityId = 1;
    
    // Mapping to track retired tokens
    mapping(uint256 => bool) public isRetired;
    mapping(uint256 => address) public retiredBy;
    mapping(uint256 => uint256) public retiredAt;
    
    // Token metadata
    mapping(uint256 => uint256) public tokenCountry;
    mapping(uint256 => uint256) public tokenState;
    mapping(uint256 => uint256) public tokenCity;
    mapping(uint256 => address) public tokenProducer;
    mapping(uint256 => uint256) public tokenIssuedAt;
    
    // Events
    event CreditsIssued(address indexed to, uint256 amount, uint256 fromId, uint256 toId, uint256 indexed cityId);
    event CreditRetired(address indexed owner, uint256 indexed tokenId, uint256 timestamp);
    event CountryAdminAppointed(address indexed admin, uint256 indexed countryId, address indexed appointedBy);
    event StateAdminAppointed(address indexed admin, uint256 indexed stateId, uint256 indexed countryId, address indexed appointedBy);
    event CityAdminAppointed(address indexed admin, uint256 indexed cityId, uint256 indexed stateId, address indexed appointedBy);
    event ProducerRegistered(address indexed producer, uint256 indexed cityId, address indexed approvedBy);
    event BuyerRegistered(address indexed buyer, address indexed registeredBy);

    // Mapping to track certified production requests
    mapping(bytes32 => bool) public certifiedRequests;
    mapping(bytes32 => address) public requestCertifiers;
    mapping(bytes32 => uint256) public requestCities;

    constructor(address mainAdmin) ERC721("HydroCred H2 Token", "H2T") {
        require(mainAdmin != address(0), "Main admin cannot be zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, mainAdmin);
    }

    /**
     * @dev Appoint a Country Admin (Main Admin only)
     * @param admin Address to appoint as Country Admin
     * @return countryId The assigned country ID
     */
    function appointCountryAdmin(address admin) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        returns (uint256) 
    {
        require(admin != address(0), "Cannot appoint zero address");
        require(!hasRole(COUNTRY_ADMIN_ROLE, admin), "Already a Country Admin");
        
        uint256 countryId = nextCountryId++;
        _grantRole(COUNTRY_ADMIN_ROLE, admin);
        adminCountries[admin] = countryId;
        
        emit CountryAdminAppointed(admin, countryId, msg.sender);
        return countryId;
    }

    /**
     * @dev Appoint a State Admin (Country Admin only)
     * @param admin Address to appoint as State Admin
     * @param countryId Country ID for this state
     * @return stateId The assigned state ID
     */
    function appointStateAdmin(address admin, uint256 countryId) 
        external 
        onlyRole(COUNTRY_ADMIN_ROLE) 
        returns (uint256) 
    {
        require(admin != address(0), "Cannot appoint zero address");
        require(adminCountries[msg.sender] == countryId, "Can only appoint within your country");
        require(!hasRole(STATE_ADMIN_ROLE, admin), "Already a State Admin");
        
        uint256 stateId = nextStateId++;
        _grantRole(STATE_ADMIN_ROLE, admin);
        adminStates[admin] = stateId;
        stateToCountry[stateId] = countryId;
        
        emit StateAdminAppointed(admin, stateId, countryId, msg.sender);
        return stateId;
    }

    /**
     * @dev Appoint a City Admin/Certifier (State Admin only)
     * @param admin Address to appoint as City Admin
     * @param stateId State ID for this city
     * @return cityId The assigned city ID
     */
    function appointCityAdmin(address admin, uint256 stateId) 
        external 
        onlyRole(STATE_ADMIN_ROLE) 
        returns (uint256) 
    {
        require(admin != address(0), "Cannot appoint zero address");
        require(adminStates[msg.sender] == stateId, "Can only appoint within your state");
        require(!hasRole(CITY_ADMIN_ROLE, admin), "Already a City Admin");
        
        uint256 cityId = nextCityId++;
        _grantRole(CITY_ADMIN_ROLE, admin);
        adminCities[admin] = cityId;
        cityToState[cityId] = stateId;
        
        emit CityAdminAppointed(admin, cityId, stateId, msg.sender);
        return cityId;
    }

    /**
     * @dev Register a Producer (City Admin only)
     * @param producer Address to register as Producer
     * @param cityId City ID where producer operates
     */
    function registerProducer(address producer, uint256 cityId) 
        external 
        onlyRole(CITY_ADMIN_ROLE) 
    {
        require(producer != address(0), "Cannot register zero address");
        require(adminCities[msg.sender] == cityId, "Can only register within your city");
        require(!hasRole(PRODUCER_ROLE, producer), "Already a Producer");
        require(!hasRole(CITY_ADMIN_ROLE, producer), "Admins cannot be producers");
        require(!hasRole(STATE_ADMIN_ROLE, producer), "Admins cannot be producers");
        require(!hasRole(COUNTRY_ADMIN_ROLE, producer), "Admins cannot be producers");
        require(!hasRole(DEFAULT_ADMIN_ROLE, producer), "Admins cannot be producers");
        
        _grantRole(PRODUCER_ROLE, producer);
        producerCities[producer] = cityId;
        
        emit ProducerRegistered(producer, cityId, msg.sender);
    }

    /**
     * @dev Register a Buyer (Self-registration)
     */
    function registerBuyer() external {
        require(!hasRole(BUYER_ROLE, msg.sender), "Already a Buyer");
        require(!hasRole(PRODUCER_ROLE, msg.sender), "Producers cannot be buyers");
        
        _grantRole(BUYER_ROLE, msg.sender);
        
        emit BuyerRegistered(msg.sender, msg.sender);
    }
    
    /**
     * @dev Certify a production request (City Admin only)
     * @param requestHash Hash of the production request
     * @param cityId City ID where production occurred
     */
    function certifyRequest(bytes32 requestHash, uint256 cityId) 
        external 
        onlyRole(CITY_ADMIN_ROLE) 
        whenNotPaused 
    {
        require(requestHash != bytes32(0), "Invalid request hash");
        require(!certifiedRequests[requestHash], "Request already certified");
        require(adminCities[msg.sender] == cityId, "Can only certify within your city");
        
        certifiedRequests[requestHash] = true;
        requestCertifiers[requestHash] = msg.sender;
        requestCities[requestHash] = cityId;
    }

    /**
     * @dev Batch issue credits to a producer based on certified production request
     * @param to Address to receive the credits (must be a registered producer)
     * @param amount Number of credits to issue (represents kg of H2)
     * @param requestHash Hash of the certified production request
     */
    function batchIssue(address to, uint256 amount, bytes32 requestHash) 
        external 
        onlyRole(CITY_ADMIN_ROLE) 
        whenNotPaused 
    {
        require(to != address(0), "Cannot issue to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= 1000, "Cannot issue more than 1000 credits at once");
        require(hasRole(PRODUCER_ROLE, to), "Can only issue to registered producers");
        require(certifiedRequests[requestHash], "Request not certified");
        require(requestCertifiers[requestHash] == msg.sender, "Only certifier can issue credits");
        
        // Prevent admins from minting tokens for themselves
        require(to != msg.sender, "Cannot issue credits to self");
        
        uint256 cityId = requestCities[requestHash];
        require(producerCities[to] == cityId, "Producer not in same city as request");
        
        uint256 fromId = _nextTokenId;
        uint256 toId = _nextTokenId + amount - 1;
        
        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId = _nextTokenId;
            _safeMint(to, tokenId);
            
            // Set token metadata
            tokenCountry[tokenId] = getCountryForCity(cityId);
            tokenState[tokenId] = getStateForCity(cityId);
            tokenCity[tokenId] = cityId;
            tokenProducer[tokenId] = to;
            tokenIssuedAt[tokenId] = block.timestamp;
            
            _nextTokenId++;
        }
        
        // Mark request as processed
        delete certifiedRequests[requestHash];
        delete requestCertifiers[requestHash];
        delete requestCities[requestHash];
        
        emit CreditsIssued(to, amount, fromId, toId, cityId);
    }
    
    // Helper mappings for geographic hierarchy
    mapping(uint256 => uint256) public stateToCountry;
    mapping(uint256 => uint256) public cityToState;

    /**
     * @dev Get country ID for a given city ID
     * @param cityId The city ID
     * @return countryId The country ID
     */
    function getCountryForCity(uint256 cityId) public view returns (uint256) {
        uint256 stateId = cityToState[cityId];
        return stateToCountry[stateId];
    }

    /**
     * @dev Get state ID for a given city ID
     * @param cityId The city ID
     * @return stateId The state ID
     */
    function getStateForCity(uint256 cityId) public view returns (uint256) {
        return cityToState[cityId];
    }

    /**
     * @dev Set geographic hierarchy (used internally)
     * @param cityId City ID
     * @param stateId State ID
     * @param countryId Country ID
     */
    function _setGeographicHierarchy(uint256 cityId, uint256 stateId, uint256 countryId) internal {
        cityToState[cityId] = stateId;
        stateToCountry[stateId] = countryId;
    }

    /**
     * @dev Retire a credit (makes it non-transferable, only buyers can retire)
     * @param tokenId The token ID to retire
     */
    function retire(uint256 tokenId) external {
        require(_ownerOf(tokenId) == msg.sender, "Only owner can retire credit");
        require(hasRole(BUYER_ROLE, msg.sender), "Only buyers can retire credits");
        require(!isRetired[tokenId], "Credit already retired");
        
        isRetired[tokenId] = true;
        retiredBy[tokenId] = msg.sender;
        retiredAt[tokenId] = block.timestamp;
        
        emit CreditRetired(msg.sender, tokenId, block.timestamp);
    }

    /**
     * @dev Override transfer to ensure only certified producers can sell to buyers
     */
    function transferFrom(address from, address to, uint256 tokenId) 
        public 
        override(ERC721, IERC721) 
    {
        require(!isRetired[tokenId], "Cannot transfer retired credit");
        
        // If transferring to a buyer, ensure from is a producer
        if (hasRole(BUYER_ROLE, to)) {
            require(hasRole(PRODUCER_ROLE, from), "Buyers can only purchase from certified producers");
        }
        
        super.transferFrom(from, to, tokenId);
    }

    /**
     * @dev Override safeTransferFrom to ensure only certified producers can sell to buyers
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) 
        public 
        override(ERC721, IERC721) 
    {
        require(!isRetired[tokenId], "Cannot transfer retired credit");
        
        // If transferring to a buyer, ensure from is a producer
        if (hasRole(BUYER_ROLE, to)) {
            require(hasRole(PRODUCER_ROLE, from), "Buyers can only purchase from certified producers");
        }
        
        super.safeTransferFrom(from, to, tokenId, data);
    }

    /**
     * @dev Get all token IDs owned by an address
     * @param owner Address to query
     * @return Array of token IDs
     */
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        
        for (uint256 i = 0; i < tokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokenIds;
    }

    /**
     * @dev Get user's role information
     * @param user Address to query
     * @return role String representation of the user's primary role
     */
    function getUserRole(address user) external view returns (string memory role) {
        if (hasRole(DEFAULT_ADMIN_ROLE, user)) return "MAIN_ADMIN";
        if (hasRole(COUNTRY_ADMIN_ROLE, user)) return "COUNTRY_ADMIN";
        if (hasRole(STATE_ADMIN_ROLE, user)) return "STATE_ADMIN";
        if (hasRole(CITY_ADMIN_ROLE, user)) return "CITY_ADMIN";
        if (hasRole(PRODUCER_ROLE, user)) return "PRODUCER";
        if (hasRole(BUYER_ROLE, user)) return "BUYER";
        return "NONE";
    }

    /**
     * @dev Get total supply of active (non-retired) tokens
     * @return count Number of active tokens
     */
    function activeSupply() external view returns (uint256 count) {
        uint256 total = totalSupply();
        for (uint256 i = 1; i < _nextTokenId; i++) {
            if (_exists(i) && !isRetired[i]) {
                count++;
            }
        }
    }

    /**
     * @dev Override update function to prevent transfer of retired tokens
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        override(ERC721, ERC721Enumerable) 
        whenNotPaused 
        returns (address) 
    {
        address from = _ownerOf(tokenId);
        if (from != address(0)) { // Skip check for minting
            require(!isRetired[tokenId], "Cannot transfer retired credit");
        }
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override _increaseBalance function
     */
    function _increaseBalance(address account, uint128 value) 
        internal 
        override(ERC721, ERC721Enumerable) 
    {
        super._increaseBalance(account, value);
    }

    /**
     * @dev Pause contract (Main Admin only)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract (Main Admin only)
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // Required overrides
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}